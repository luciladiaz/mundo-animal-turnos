import type { Prisma, PrismaClient } from "@prisma/client";
import { ErrorNegocio } from "@/lib/errorNegocio";

type Tx = Prisma.TransactionClient;

/**
 * Devuelve la caja abierta y la deja BLOQUEADA hasta el fin de la transacción: así una
 * venta no se puede colar mientras otra persona está cerrando la caja.
 */
export async function cajaAbiertaBloqueada(tx: Tx): Promise<{ id: string }> {
  const filas = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Caja" WHERE estado = 'ABIERTA' FOR UPDATE`;
  if (filas.length === 0) throw new ErrorNegocio("La caja está cerrada: abrila para poder operar", 409);
  return filas[0];
}

export async function abrirCaja(db: PrismaClient, datos: { efectivoInicial: number; usuario: string }) {
  if (!Number.isInteger(datos.efectivoInicial) || datos.efectivoInicial < 0) {
    throw new ErrorNegocio("El efectivo inicial tiene que ser 0 o más");
  }
  // Si dos personas la abren a la vez, el índice único "Caja_una_sola_abierta" rechaza la segunda.
  return db.caja.create({ data: { efectivoInicial: datos.efectivoInicial, abiertaPor: datos.usuario } });
}

export interface ResumenMedio {
  medioPagoId: string;
  nombre: string;
  esEfectivo: boolean;
  inicial: number;
  movimientos: number;
  esperado: number;
}

/**
 * Lo que DEBERÍA haber en cada medio de pago: efectivo inicial (solo efectivo) + la suma
 * de todos los movimientos de la caja en ese medio. Incluye todos los medios activos y
 * cualquier medio inactivo que haya tenido movimientos en esta caja.
 */
export async function esperadoPorMedio(db: PrismaClient | Tx, cajaId: string): Promise<ResumenMedio[]> {
  const caja = await db.caja.findUnique({ where: { id: cajaId } });
  if (!caja) throw new ErrorNegocio("Caja no encontrada", 404);
  const sumas = await db.movimientoCaja.groupBy({ by: ["medioPagoId"], where: { cajaId }, _sum: { monto: true } });
  const medios = await db.medioPago.findMany({
    where: { OR: [{ activo: true }, { id: { in: sumas.map((s) => s.medioPagoId) } }] },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
  return medios.map((m) => {
    const movimientos = sumas.find((s) => s.medioPagoId === m.id)?._sum.monto ?? 0;
    const inicial = m.esEfectivo ? caja.efectivoInicial : 0;
    return { medioPagoId: m.id, nombre: m.nombre, esEfectivo: m.esEfectivo, inicial, movimientos, esperado: inicial + movimientos };
  });
}

/** Gasto, ingreso extra o retiro de plata de la caja abierta. */
export async function registrarMovimientoManual(
  db: PrismaClient,
  datos: { tipo: "GASTO" | "INGRESO" | "RETIRO"; medioPagoId: string; monto: number; descripcion: string; usuario: string }
) {
  if (!Number.isInteger(datos.monto) || datos.monto <= 0) throw new ErrorNegocio("El monto tiene que ser mayor a 0");
  if (!datos.descripcion.trim()) throw new ErrorNegocio("Escribí una descripción");
  return db.$transaction(async (tx) => {
    const caja = await cajaAbiertaBloqueada(tx);
    const medio = await tx.medioPago.findUnique({ where: { id: datos.medioPagoId } });
    if (!medio) throw new ErrorNegocio("Medio de pago no encontrado", 404);
    return tx.movimientoCaja.create({
      data: {
        cajaId: caja.id,
        medioPagoId: medio.id,
        tipo: datos.tipo,
        monto: datos.tipo === "INGRESO" ? datos.monto : -datos.monto,
        descripcion: datos.descripcion.trim(),
        usuario: datos.usuario,
      },
    });
  });
}

/**
 * Cierre: por cada medio se guarda lo esperado (calculado acá, no lo que mande el
 * navegador) y lo contado. Hay que informar lo contado de TODOS los medios del resumen.
 */
export async function cerrarCaja(
  db: PrismaClient,
  datos: { conteos: { medioPagoId: string; contado: number }[]; observaciones?: string | null; usuario: string }
) {
  return db.$transaction(
    async (tx) => {
      const caja = await cajaAbiertaBloqueada(tx);
      const resumen = await esperadoPorMedio(tx, caja.id);
      for (const r of resumen) {
        const conteo = datos.conteos.find((c) => c.medioPagoId === r.medioPagoId);
        if (!conteo || !Number.isInteger(conteo.contado) || conteo.contado < 0) {
          throw new ErrorNegocio(`Falta cargar lo contado en ${r.nombre}`);
        }
      }
      await tx.cajaConteo.createMany({
        data: resumen.map((r) => ({
          cajaId: caja.id,
          medioPagoId: r.medioPagoId,
          esperado: r.esperado,
          contado: datos.conteos.find((c) => c.medioPagoId === r.medioPagoId)!.contado,
        })),
      });
      return tx.caja.update({
        where: { id: caja.id },
        data: {
          estado: "CERRADA",
          cerradaEn: new Date(),
          cerradaPor: datos.usuario,
          observacionesCierre: datos.observaciones?.trim() || null,
        },
      });
    },
    { timeout: 15000 }
  );
}
