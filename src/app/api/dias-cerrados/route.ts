import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

// GET: público — el calendario de reserva necesita saber qué fechas puntuales están cerradas.
export async function GET() {
  const diasCerrados = await prisma.diaCerrado.findMany({ orderBy: { fecha: "asc" } });
  return NextResponse.json({ diasCerrados });
}

const crearDiaCerradoSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  motivo: z.string().optional(),
});

// POST: agregar una fecha cerrada (feriado, cierre especial).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "configuracion")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = crearDiaCerradoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  try {
    const diaCerrado = await prisma.diaCerrado.create({ data: parsed.data });
    return NextResponse.json({ diaCerrado }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Esa fecha ya está marcada como cerrada" }, { status: 409 });
    }
    console.error("Error creando día cerrado:", err);
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }
}
