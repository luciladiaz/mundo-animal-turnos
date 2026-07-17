import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

// GET: público — el calendario de reserva necesita saber qué días están habilitados.
export async function GET() {
  const bloques = await prisma.horarioBloque.findMany({
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
  });
  return NextResponse.json({ bloques });
}

const bloqueSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/),
});

const reemplazarSchema = z.object({ bloques: z.array(bloqueSchema) });

// PUT: reemplaza todo el horario semanal de una — es más simple y menos propenso
// a errores que un CRUD fino de bloques individuales para una grilla tan chica.
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "configuracion")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = reemplazarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.horarioBloque.deleteMany({}),
    prisma.horarioBloque.createMany({ data: parsed.data.bloques }),
  ]);

  const bloques = await prisma.horarioBloque.findMany({
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
  });
  return NextResponse.json({ bloques });
}
