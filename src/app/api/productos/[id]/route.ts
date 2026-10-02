import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { claveNombreProducto, datosProductoSchema } from "@/lib/productos";

// GET: producto con sus lotes y el historial de movimientos de stock.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "stock")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: {
      categoria: { select: { nombre: true } },
      lotes: { orderBy: [{ generico: "asc" }, { vencimiento: { sort: "asc", nulls: "last" } }] },
      movimientos: {
        include: {
          lote: { select: { codigo: true, vencimiento: true, generico: true } },
          ventaItem: { select: { venta: { select: { numero: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      },
    },
  });
  if (!producto) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  return NextResponse.json({ producto });
}

// PATCH: editar datos del producto. El stock NO se edita acá (ver /stock: ingreso o ajuste).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "stock")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = datosProductoSchema.extend({}).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const actual = await prisma.producto.findUnique({ where: { id } });
  if (!actual) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const nombreClave = claveNombreProducto(parsed.data.nombre);
  const repetido = await prisma.producto.findFirst({ where: { nombreClave, id: { not: id } }, select: { nombre: true } });
  if (repetido) {
    return NextResponse.json({ error: `Ya existe un producto con ese nombre: ${repetido.nombre}` }, { status: 409 });
  }
  // Pasar de "controla vencimiento" a no hacerlo con lotes reales cargados dejaría lotes huérfanos.
  if (actual.controlaVencimiento && !parsed.data.controlaVencimiento) {
    const conLotes = await prisma.loteStock.count({ where: { productoId: id, generico: false, cantidad: { not: 0 } } });
    if (conLotes > 0) {
      return NextResponse.json(
        { error: "Tiene lotes con vencimiento cargados: ajustalos a 0 antes de dejar de controlar vencimientos" },
        { status: 400 }
      );
    }
  }
  const activo = typeof body.activo === "boolean" ? body.activo : actual.activo;
  const producto = await prisma.producto.update({ where: { id }, data: { ...parsed.data, nombreClave, activo } });
  return NextResponse.json({ producto });
}
