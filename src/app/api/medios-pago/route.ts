import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

// GET: medios de pago (activos; con ?todos=1 también los desactivados, para configurarlos).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "ventas") && !tienePermiso(session, "configuracion")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const todos = new URL(req.url).searchParams.get("todos") === "1";
  const medios = await prisma.medioPago.findMany({
    where: todos ? {} : { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
  return NextResponse.json({ medios });
}

const crearSchema = z.object({ nombre: z.string().trim().min(1, "Falta el nombre") });

// POST: agregar un medio de pago nuevo (ej. "Cuenta DNI").
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "configuracion")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const parsed = crearSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const existe = await prisma.medioPago.findFirst({ where: { nombre: { equals: parsed.data.nombre, mode: "insensitive" } } });
  if (existe) return NextResponse.json({ error: "Ya existe un medio de pago con ese nombre" }, { status: 409 });
  const ultimo = await prisma.medioPago.aggregate({ _max: { orden: true } });
  const medio = await prisma.medioPago.create({ data: { nombre: parsed.data.nombre, orden: (ultimo._max.orden ?? 0) + 1 } });
  return NextResponse.json({ medio }, { status: 201 });
}
