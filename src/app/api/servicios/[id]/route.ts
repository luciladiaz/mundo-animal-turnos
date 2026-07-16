import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { esAdmin } from "@/lib/autorizacion";

const actualizarServicioSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional().nullable(),
  duracionMinutos: z.number().int().positive().optional(),
  precio: z.number().nonnegative().optional().nullable(),
  activo: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!esAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = actualizarServicioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const servicio = await prisma.servicio.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ servicio });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!esAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  // No borramos en duro (rompería el historial de turnos ya tomados con este servicio) —
  // lo desactivamos, que es lo que efectivamente pide el modelo de datos ("activo: bool").
  const servicio = await prisma.servicio.update({ where: { id }, data: { activo: false } });
  return NextResponse.json({ servicio });
}
