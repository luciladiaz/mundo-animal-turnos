import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

// GET: detalle de una caja (abierta o cerrada) — "historial" lista las cerradas.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;

  if (id === "historial") {
    const cajas = await prisma.caja.findMany({
      where: { estado: "CERRADA" },
      include: { conteos: true, _count: { select: { ventas: true } } },
      orderBy: { abiertaEn: "desc" },
      take: 90,
    });
    return NextResponse.json({
      cajas: cajas.map((c) => ({
        id: c.id,
        abiertaEn: c.abiertaEn,
        abiertaPor: c.abiertaPor,
        cerradaEn: c.cerradaEn,
        cerradaPor: c.cerradaPor,
        ventas: c._count.ventas,
        esperado: c.conteos.reduce((a, x) => a + x.esperado, 0),
        contado: c.conteos.reduce((a, x) => a + x.contado, 0),
      })),
    });
  }

  const caja = await prisma.caja.findUnique({
    where: { id },
    include: {
      conteos: { include: { medioPago: { select: { nombre: true } } } },
      movimientos: {
        include: { medioPago: { select: { nombre: true } }, venta: { select: { numero: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!caja) return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
  return NextResponse.json({ caja });
}
