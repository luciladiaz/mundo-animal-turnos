import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";
import { claveNombreProducto, datosProductoSchema, stockInicialSchema } from "@/lib/productos";
import { ingresarStock } from "@/lib/stock";
import { respuestaDeError } from "@/lib/errorNegocio";
import { getFechaHoyArgentina, sumarDias } from "@/lib/disponibilidad";

// GET: lista de productos con su stock, filtros por texto, categoría y alertas.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "stock") && !tienePermiso(session, "ventas")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const sp = new URL(req.url).searchParams;
  const q = claveNombreProducto(sp.get("q") ?? "");
  const categoriaId = sp.get("categoriaId");
  const filtro = sp.get("filtro"); // "bajo" | "negativo" | "inactivos"

  const where: Prisma.ProductoWhereInput = {
    activo: filtro === "inactivos" ? false : true,
    ...(q ? { nombreClave: { contains: q } } : {}),
    ...(categoriaId ? { categoriaId } : {}),
    ...(filtro === "negativo" ? { stock: { lt: 0 } } : {}),
  };
  let productos = await prisma.producto.findMany({
    where,
    include: { categoria: { select: { nombre: true } } },
    orderBy: { nombre: "asc" },
    take: 300,
  });
  if (filtro === "bajo") productos = productos.filter((p) => p.stock <= p.stockMinimo);

  // Lotes por vencer en los próximos 60 días (con stock positivo), para la alerta.
  const hoy = getFechaHoyArgentina();
  const porVencer = await prisma.loteStock.findMany({
    where: { generico: false, cantidad: { gt: 0 }, vencimiento: { not: null, lte: sumarDias(hoy, 60) } },
    select: { productoId: true, vencimiento: true, cantidad: true, codigo: true, producto: { select: { nombre: true, activo: true } } },
    orderBy: { vencimiento: "asc" },
  });
  return NextResponse.json({ productos, porVencer, hoy });
}

// POST: alta de producto, con stock inicial opcional (queda como movimiento INICIAL).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "stock")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = datosProductoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const inicial = body.stockInicial ? stockInicialSchema.safeParse(body.stockInicial) : null;
  if (inicial && !inicial.success) {
    return NextResponse.json({ error: inicial.error.issues[0]?.message ?? "Stock inicial inválido" }, { status: 400 });
  }

  const nombreClave = claveNombreProducto(parsed.data.nombre);
  const repetido = await prisma.producto.findFirst({ where: { nombreClave }, select: { nombre: true } });
  if (repetido) {
    return NextResponse.json({ error: `Ya existe un producto con ese nombre: ${repetido.nombre}` }, { status: 409 });
  }

  try {
    const producto = await prisma.$transaction(async (tx) => {
      const creado = await tx.producto.create({ data: { ...parsed.data, nombreClave } });
      if (inicial?.success) {
        await ingresarStock(tx, {
          productoId: creado.id,
          cantidad: inicial.data.cantidad,
          tipo: "INICIAL",
          usuario: nombreUsuario(session),
          codigoLote: inicial.data.codigoLote,
          vencimiento: inicial.data.vencimiento,
        });
      }
      return creado;
    });
    return NextResponse.json({ producto }, { status: 201 });
  } catch (err) {
    return respuestaDeError(err);
  }
}
