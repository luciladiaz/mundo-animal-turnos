import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import { ErrorNegocio } from "@/lib/errorNegocio";
import { cajaAbiertaBloqueada } from "@/lib/caja";
import { bloquearProductos, descontarPorVenta, devolverPorAnulacion } from "@/lib/stock";

type Tx = Prisma.TransactionClient;

const centavos = z.number().int("Monto inválido").min(0, "Monto inválido");

export const nuevaVentaSchema = z.object({
  items: z
    .array(
      z
        .object({
          productoId: z.string().optional().nullable(),
          servicioId: z.string().optional().nullable(),
          cantidad: z.number().int("La cantidad tiene que ser un número entero").min(1, "La cantidad mínima es 1"),
          // Precio cobrado por unidad; si no viene, se usa el de lista.
          precioUnitario: centavos.optional().nullable(),
        })
        .refine((i) => Boolean(i.productoId) !== Boolean(i.servicioId), "Cada ítem es un producto o un servicio")
    )
    .min(1, "Agregá al menos un producto o servicio"),
  pagos: z.array(z.object({ medioPagoId: z.string().min(1), monto: centavos.min(1, "Cada pago tiene que ser mayor a 0") })),
  tutorId: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

export type NuevaVenta = z.infer<typeof nuevaVentaSchema>;

/**
 * Registra una venta completa en UNA transacción: ítems, descuento de stock, pagos y
 * movimientos de caja. Si algo falla, no queda nada guardado.
 * Lo que no se paga queda en la cuenta corriente del cliente (tiene que haber cliente).
 */
export async function crearVenta(db: PrismaClient, datos: NuevaVenta, usuario: string) {
  return db.$transaction(
    async (tx) => {
      const caja = await cajaAbiertaBloqueada(tx);

      const productoIds = datos.items.flatMap((i) => (i.productoId ? [i.productoId] : []));
      const servicioIds = datos.items.flatMap((i) => (i.servicioId ? [i.servicioId] : []));
      await bloquearProductos(tx, productoIds);
      const [productos, servicios] = await Promise.all([
        tx.producto.findMany({ where: { id: { in: productoIds } } }),
        tx.servicio.findMany({ where: { id: { in: servicioIds } } }),
      ]);

      const lineas = datos.items.map((i) => {
        if (i.productoId) {
          const p = productos.find((x) => x.id === i.productoId);
          if (!p) throw new ErrorNegocio("Uno de los productos ya no existe", 404);
          if (!p.activo) throw new ErrorNegocio(`"${p.nombre}" está desactivado`);
          const precio = i.precioUnitario ?? p.precioVenta;
          return { productoId: p.id, servicioId: null, descripcion: p.nombre, cantidad: i.cantidad, precioLista: p.precioVenta, precioUnitario: precio };
        }
        const s = servicios.find((x) => x.id === i.servicioId);
        if (!s) throw new ErrorNegocio("Uno de los servicios ya no existe", 404);
        const lista = s.precio != null ? Math.round(s.precio * 100) : 0;
        const precio = i.precioUnitario ?? (s.precio != null ? lista : null);
        if (precio == null) throw new ErrorNegocio(`"${s.nombre}" no tiene precio cargado: escribí el precio`);
        return { productoId: null, servicioId: s.id, descripcion: s.nombre, cantidad: i.cantidad, precioLista: lista, precioUnitario: precio };
      });

      const total = lineas.reduce((acc, l) => acc + l.precioUnitario * l.cantidad, 0);
      const pagado = datos.pagos.reduce((acc, p) => acc + p.monto, 0);
      if (pagado > total) throw new ErrorNegocio("Los pagos suman más que el total de la venta");
      if (pagado < total && !datos.tutorId) {
        throw new ErrorNegocio("Falta cobrar una parte: para dejarla en cuenta corriente elegí el cliente");
      }
      if (datos.tutorId) {
        const tutor = await tx.tutor.findUnique({ where: { id: datos.tutorId }, select: { id: true } });
        if (!tutor) throw new ErrorNegocio("Cliente no encontrado", 404);
      }
      const medioIds = [...new Set(datos.pagos.map((p) => p.medioPagoId))];
      const medios = await tx.medioPago.findMany({ where: { id: { in: medioIds } } });
      if (medios.length !== medioIds.length) throw new ErrorNegocio("Medio de pago no encontrado", 404);

      const venta = await tx.venta.create({
        data: {
          cajaId: caja.id,
          tutorId: datos.tutorId || null,
          total,
          pagado,
          observaciones: datos.observaciones?.trim() || null,
          usuario,
        },
      });

      for (const l of lineas) {
        const item = await tx.ventaItem.create({
          data: { ventaId: venta.id, ...l, subtotal: l.precioUnitario * l.cantidad },
        });
        if (l.productoId) {
          await descontarPorVenta(tx, { productoId: l.productoId, cantidad: l.cantidad, ventaItemId: item.id, usuario });
        }
      }

      for (const p of datos.pagos) {
        await tx.ventaPago.create({ data: { ventaId: venta.id, medioPagoId: p.medioPagoId, monto: p.monto } });
        await tx.movimientoCaja.create({
          data: { cajaId: caja.id, medioPagoId: p.medioPagoId, tipo: "VENTA", monto: p.monto, ventaId: venta.id, usuario },
        });
      }
      return venta;
    },
    { timeout: 20000 }
  );
}

/**
 * Anula una venta: la marca ANULADA con motivo, devuelve todo el stock a los mismos
 * lotes y registra la devolución de cada pago en la caja ABIERTA de hoy (una caja
 * cerrada nunca se toca). Lo que había quedado en cuenta corriente deja de deberse.
 */
export async function anularVenta(db: PrismaClient, datos: { ventaId: string; motivo: string }, usuario: string) {
  const motivo = datos.motivo.trim();
  if (!motivo) throw new ErrorNegocio("El motivo de la anulación es obligatorio");
  return db.$transaction(
    async (tx) => {
      const caja = await cajaAbiertaBloqueada(tx);
      const bloqueada = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Venta" WHERE id = ${datos.ventaId} FOR UPDATE`;
      if (bloqueada.length === 0) throw new ErrorNegocio("Venta no encontrada", 404);
      const venta = await tx.venta.findUniqueOrThrow({ where: { id: datos.ventaId }, include: { items: true, pagos: true } });
      if (venta.estado === "ANULADA") throw new ErrorNegocio("Esta venta ya estaba anulada", 409);

      await bloquearProductos(tx, venta.items.flatMap((i) => (i.productoId ? [i.productoId] : [])));
      for (const item of venta.items) {
        if (item.productoId) await devolverPorAnulacion(tx, { ventaItemId: item.id, usuario, motivo });
      }
      for (const p of venta.pagos) {
        await tx.movimientoCaja.create({
          data: {
            cajaId: caja.id,
            medioPagoId: p.medioPagoId,
            tipo: "ANULACION_VENTA",
            monto: -p.monto,
            ventaId: venta.id,
            descripcion: `Anulación de la venta N° ${venta.numero}: ${motivo}`,
            usuario,
          },
        });
      }
      return tx.venta.update({
        where: { id: venta.id },
        data: { estado: "ANULADA", anuladaEn: new Date(), anuladaPor: usuario, motivoAnulacion: motivo, cajaAnulacionId: caja.id },
      });
    },
    { timeout: 20000 }
  );
}

/** Saldo de cuenta corriente: lo que quedó sin pagar en ventas activas menos lo que pagó después. */
export async function saldoCuentaCorriente(db: PrismaClient | Tx, tutorId: string): Promise<number> {
  const [ventas, pagos] = await Promise.all([
    db.venta.aggregate({ where: { tutorId, estado: "ACTIVA" }, _sum: { total: true, pagado: true } }),
    db.pagoCuentaCorriente.aggregate({ where: { tutorId }, _sum: { monto: true } }),
  ]);
  return (ventas._sum.total ?? 0) - (ventas._sum.pagado ?? 0) - (pagos._sum.monto ?? 0);
}

/** Cobro de deuda de cuenta corriente: entra a la caja abierta de hoy. */
export async function cobrarCuentaCorriente(
  db: PrismaClient,
  datos: { tutorId: string; medioPagoId: string; monto: number },
  usuario: string
) {
  if (!Number.isInteger(datos.monto) || datos.monto <= 0) throw new ErrorNegocio("El monto tiene que ser mayor a 0");
  return db.$transaction(
    async (tx) => {
      const caja = await cajaAbiertaBloqueada(tx);
      // Bloquea al cliente para que dos cobros simultáneos no pasen el saldo.
      const t = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Tutor" WHERE id = ${datos.tutorId} FOR UPDATE`;
      if (t.length === 0) throw new ErrorNegocio("Cliente no encontrado", 404);
      const saldo = await saldoCuentaCorriente(tx, datos.tutorId);
      if (datos.monto > saldo) throw new ErrorNegocio("El cobro es mayor a lo que debe el cliente");
      const medio = await tx.medioPago.findUnique({ where: { id: datos.medioPagoId } });
      if (!medio) throw new ErrorNegocio("Medio de pago no encontrado", 404);
      const pago = await tx.pagoCuentaCorriente.create({
        data: { tutorId: datos.tutorId, cajaId: caja.id, medioPagoId: medio.id, monto: datos.monto, usuario },
      });
      await tx.movimientoCaja.create({
        data: {
          cajaId: caja.id,
          medioPagoId: medio.id,
          tipo: "COBRO_CUENTA_CORRIENTE",
          monto: datos.monto,
          pagoCuentaCorrienteId: pago.id,
          usuario,
        },
      });
      return pago;
    },
    { timeout: 15000 }
  );
}
