import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  ESTADOS_OCUPAN_HORARIO,
  generarSlotsDisponibles,
  getDiaSemana,
  getFechaHoyArgentina,
  getHoraAhoraArgentina,
} from "@/lib/disponibilidad";

const querySchema = z.object({
  servicioId: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    servicioId: searchParams.get("servicioId"),
    fecha: searchParams.get("fecha"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Parámetros inválidos" }, { status: 400 });
  }

  const { servicioId, fecha } = parsed.data;

  const servicio = await prisma.servicio.findUnique({ where: { id: servicioId } });
  if (!servicio || !servicio.activo) {
    return NextResponse.json({ error: "Servicio no encontrado o no disponible" }, { status: 404 });
  }

  const [configuracion, diaSemana, diaCerrado] = [
    await prisma.configuracionNegocio.findFirst(),
    getDiaSemana(fecha),
    await prisma.diaCerrado.findUnique({ where: { fecha } }),
  ];

  if (diaCerrado) {
    return NextResponse.json({ slots: [], cerrado: true });
  }

  const bloques = await prisma.horarioBloque.findMany({
    where: { diaSemana },
    orderBy: { horaInicio: "asc" },
  });

  if (bloques.length === 0) {
    return NextResponse.json({ slots: [], cerrado: true });
  }

  const turnosOcupados = await prisma.turno.findMany({
    where: {
      fecha,
      estado: { in: [...ESTADOS_OCUPAN_HORARIO] },
    },
    select: { horaInicio: true, horaFin: true },
  });

  const esHoy = fecha === getFechaHoyArgentina();

  const slots = generarSlotsDisponibles({
    bloques,
    turnosOcupados,
    duracionServicioMin: servicio.duracionMinutos,
    bufferMin: configuracion?.bufferMinutos ?? 10,
    horaMinima: esHoy ? getHoraAhoraArgentina() : undefined,
  });

  return NextResponse.json({ slots, cerrado: false });
}
