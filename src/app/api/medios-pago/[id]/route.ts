import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

const editarSchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  activo: z.boolean().optional(),
});

// PATCH: renombrar o activar/desactivar. No se borran: hay ventas y cierres que los usan.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "configuracion")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = editarSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const medio = await prisma.medioPago.findUnique({ where: { id } });
  if (!medio) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (medio.esEfectivo && parsed.data.activo === false) {
    return NextResponse.json({ error: "El efectivo no se puede desactivar: es el que lleva el cambio de la caja" }, { status: 400 });
  }
  if (parsed.data.nombre) {
    const otro = await prisma.medioPago.findFirst({
      where: { nombre: { equals: parsed.data.nombre, mode: "insensitive" }, id: { not: id } },
    });
    if (otro) return NextResponse.json({ error: "Ya existe un medio de pago con ese nombre" }, { status: 409 });
  }
  const actualizado = await prisma.medioPago.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ medio: actualizado });
}
