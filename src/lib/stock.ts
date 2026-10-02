import { Prisma, type PrismaClient, type TipoMovimientoStock } from "@prisma/client";
import { ErrorNegocio } from "@/lib/errorNegocio";

// Stock = suma de movimientos. NUNCA se escribe LoteStock.cantidad ni Producto.stock
// fuera de registrarMovimiento(): así los dos números siempre coinciden con la suma
// de MovimientoStock (lo verifica controlarCoherencia()).

type Tx = Prisma.TransactionClient;

/** Bloquea las filas de los productos hasta el fin de la transacción (ventas simultáneas). */
export async function bloquearProductos(tx: Tx, productoIds: string[]) {
  const ids = [...new Set(productoIds)].sort();
  if (ids.length === 0) return;
  await tx.$queryRaw`SELECT id FROM "Producto" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
}

async function loteGenerico(tx: Tx, productoId: string) {
  const existente = await tx.loteStock.findFirst({ where: { productoId, generico: true } });
  if (existente) return existente;
  return tx.loteStock.create({ data: { productoId, generico: true } });
}

/** Único lugar donde cambia el stock. */
async function registrarMovimiento(
  tx: Tx,
  datos: {
    productoId: string;
    loteId: string;
    tipo: TipoMovimientoStock;
    cantidad: number;
    usuario: string;
    motivo?: string | null;
    ventaItemId?: string | null;
  }
) {
  if (!Number.isInteger(datos.cantidad) || datos.cantidad === 0) {
    throw new Error(`Cantidad de movimiento inválida: ${datos.cantidad}`);
  }
  await tx.movimientoStock.create({
    data: {
      productoId: datos.productoId,
      loteId: datos.loteId,
      tipo: datos.tipo,
      cantidad: datos.cantidad,
      usuario: datos.usuario,
      motivo: datos.motivo ?? null,
      ventaItemId: datos.ventaItemId ?? null,
    },
  });
  await tx.loteStock.update({ where: { id: datos.loteId }, data: { cantidad: { increment: datos.cantidad } } });
  await tx.producto.update({ where: { id: datos.productoId }, data: { stock: { increment: datos.cantidad } } });
}

/**
 * Descuenta stock por una venta: primero los lotes reales que vencen antes, después el
 * lote genérico. Lo que falte sale igual del genérico y lo deja negativo (decisión de la
 * veterinaria: se puede vender sin stock). Llamar con el producto ya bloqueado.
 */
export async function descontarPorVenta(
  tx: Tx,
  datos: { productoId: string; cantidad: number; ventaItemId: string; usuario: string }
) {
  let restante = datos.cantidad;
  const lotes = await tx.loteStock.findMany({
    where: { productoId: datos.productoId, generico: false, cantidad: { gt: 0 } },
    orderBy: [{ vencimiento: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });
  for (const lote of lotes) {
    if (restante === 0) break;
    const sale = Math.min(lote.cantidad, restante);
    await registrarMovimiento(tx, {
      productoId: datos.productoId,
      loteId: lote.id,
      tipo: "VENTA",
      cantidad: -sale,
      usuario: datos.usuario,
      ventaItemId: datos.ventaItemId,
    });
    restante -= sale;
  }
  if (restante > 0) {
    const generico = await loteGenerico(tx, datos.productoId);
    await registrarMovimiento(tx, {
      productoId: datos.productoId,
      loteId: generico.id,
      tipo: "VENTA",
      cantidad: -restante,
      usuario: datos.usuario,
      ventaItemId: datos.ventaItemId,
    });
  }
}

/** Anulación: devuelve exactamente lo que salió, a los mismos lotes. */
export async function devolverPorAnulacion(tx: Tx, datos: { ventaItemId: string; usuario: string; motivo: string }) {
  const salidas = await tx.movimientoStock.findMany({ where: { ventaItemId: datos.ventaItemId, tipo: "VENTA" } });
  for (const s of salidas) {
    await registrarMovimiento(tx, {
      productoId: s.productoId,
      loteId: s.loteId,
      tipo: "ANULACION_VENTA",
      cantidad: -s.cantidad,
      usuario: datos.usuario,
      motivo: datos.motivo,
      ventaItemId: datos.ventaItemId,
    });
  }
}

/**
 * Entrada de mercadería (stock inicial o compra). Con lote/vencimiento va a ese lote;
 * sin vencimiento va al lote genérico (y compensa si estaba negativo).
 */
export async function ingresarStock(
  tx: Tx,
  datos: {
    productoId: string;
    cantidad: number;
    tipo: "INICIAL" | "COMPRA";
    usuario: string;
    codigoLote?: string | null;
    vencimiento?: string | null;
    motivo?: string | null;
  }
) {
  if (!Number.isInteger(datos.cantidad) || datos.cantidad <= 0) {
    throw new ErrorNegocio("La cantidad tiene que ser un número entero mayor a 0");
  }
  await bloquearProductos(tx, [datos.productoId]);
  const producto = await tx.producto.findUnique({ where: { id: datos.productoId } });
  if (!producto) throw new ErrorNegocio("Producto no encontrado", 404);

  let loteId: string;
  if (producto.controlaVencimiento && datos.vencimiento) {
    const codigo = datos.codigoLote?.trim() || null;
    const mismo = await tx.loteStock.findFirst({
      where: { productoId: producto.id, generico: false, vencimiento: datos.vencimiento, codigo },
    });
    loteId = mismo
      ? mismo.id
      : (await tx.loteStock.create({ data: { productoId: producto.id, codigo, vencimiento: datos.vencimiento } })).id;
  } else {
    if (producto.controlaVencimiento) throw new ErrorNegocio("Este producto controla vencimiento: indicá la fecha de vencimiento");
    loteId = (await loteGenerico(tx, producto.id)).id;
  }
  await registrarMovimiento(tx, {
    productoId: producto.id,
    loteId,
    tipo: datos.tipo,
    cantidad: datos.cantidad,
    usuario: datos.usuario,
    motivo: datos.motivo,
  });
}

/**
 * Ajuste manual (rotura, vencido, muestra, conteo físico): suma o resta en un lote.
 * El motivo es obligatorio.
 */
export async function ajustarStock(
  tx: Tx,
  datos: { productoId: string; loteId?: string | null; cantidad: number; motivo: string; usuario: string }
) {
  if (!Number.isInteger(datos.cantidad) || datos.cantidad === 0) {
    throw new ErrorNegocio("El ajuste tiene que ser un número entero distinto de 0");
  }
  if (!datos.motivo.trim()) throw new ErrorNegocio("El motivo del ajuste es obligatorio");
  await bloquearProductos(tx, [datos.productoId]);
  const producto = await tx.producto.findUnique({ where: { id: datos.productoId } });
  if (!producto) throw new ErrorNegocio("Producto no encontrado", 404);

  let loteId: string;
  if (datos.loteId) {
    const lote = await tx.loteStock.findUnique({ where: { id: datos.loteId } });
    if (!lote || lote.productoId !== producto.id) throw new ErrorNegocio("Lote no encontrado", 404);
    loteId = lote.id;
  } else {
    loteId = (await loteGenerico(tx, producto.id)).id;
  }
  await registrarMovimiento(tx, {
    productoId: producto.id,
    loteId,
    tipo: "AJUSTE",
    cantidad: datos.cantidad,
    usuario: datos.usuario,
    motivo: datos.motivo.trim(),
  });
}

/**
 * Control de coherencia: compara el stock guardado de cada lote y producto con la
 * suma real de sus movimientos. Tiene que devolver siempre una lista vacía.
 */
export async function controlarCoherencia(db: PrismaClient | Tx) {
  const lotes = await db.$queryRaw<{ id: string; productoId: string; guardado: number; calculado: number }[]>`
    SELECT l.id, l."productoId", l.cantidad AS guardado, COALESCE(SUM(m.cantidad), 0)::int AS calculado
    FROM "LoteStock" l LEFT JOIN "MovimientoStock" m ON m."loteId" = l.id
    GROUP BY l.id HAVING l.cantidad <> COALESCE(SUM(m.cantidad), 0)`;
  const productos = await db.$queryRaw<{ id: string; nombre: string; guardado: number; calculado: number }[]>`
    SELECT p.id, p.nombre, p.stock AS guardado, COALESCE(SUM(l.cantidad), 0)::int AS calculado
    FROM "Producto" p LEFT JOIN "LoteStock" l ON l."productoId" = p.id
    GROUP BY p.id HAVING p.stock <> COALESCE(SUM(l.cantidad), 0)`;
  return { lotes, productos };
}
