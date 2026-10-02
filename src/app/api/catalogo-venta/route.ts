import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { claveNombreProducto } from "@/lib/productos";

// GET: buscador de "Nueva venta": productos y servicios activos que coinciden con el texto.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const textoOriginal = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const q = claveNombreProducto(textoOriginal);
  if (!q) return NextResponse.json({ productos: [], servicios: [] });

  const [productos, servicios] = await Promise.all([
    prisma.producto.findMany({
      where: { activo: true, nombreClave: { contains: q } },
      select: { id: true, nombre: true, precioVenta: true, stock: true, categoria: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
      take: 15,
    }),
    prisma.servicio.findMany({
      where: { activo: true, nombre: { contains: textoOriginal, mode: "insensitive" } },
      select: { id: true, nombre: true, precio: true },
      orderBy: { nombre: "asc" },
      take: 8,
    }),
  ]);
  return NextResponse.json({
    productos,
    servicios: servicios.map((s) => ({ ...s, precio: s.precio != null ? Math.round(s.precio * 100) : null })),
  });
}
