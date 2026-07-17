import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

// GET: público (solo servicios activos) o admin (todos, con ?todos=1)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const quiereTodos = searchParams.get("todos") === "1";

  if (quiereTodos) {
    const session = await auth();
    if (!tienePermiso(session, "servicios")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const servicios = await prisma.servicio.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({ servicios });
  }

  const servicios = await prisma.servicio.findMany({
    where: { activo: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ servicios });
}

const crearServicioSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  duracionMinutos: z.number().int().positive(),
  precio: z.number().nonnegative().optional().nullable(),
  activo: z.boolean().optional(),
});

// POST: crear servicio (solo admin)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "servicios")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = crearServicioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const servicio = await prisma.servicio.create({ data: parsed.data });
  return NextResponse.json({ servicio }, { status: 201 });
}
