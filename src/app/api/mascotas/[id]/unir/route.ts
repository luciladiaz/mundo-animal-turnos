import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { puedeVerFichas } from "@/lib/autorizacion";

const unirSchema = z.object({ destinoId: z.string().min(1) });

// Campos de la reseña que se copian a la ficha que queda si allá estaban vacíos.
const CAMPOS_RESEÑA = [
  "especie",
  "raza",
  "sexo",
  "castrado",
  "fechaNacimiento",
  "color",
  "microchip",
  "pesoKg",
  "fotoUrl",
  "alertas",
  "notas",
] as const;

/**
 * POST: une esta mascota (duplicada, ej. "Flopy") con otra del mismo tutor ("Floppy").
 * Los turnos y las consultas pasan a la ficha destino, los datos que allá faltaban se
 * completan con los de esta, y esta ficha se elimina. Turnos y consultas no se modifican
 * salvo su vínculo.
 * OJO: cualquier tabla nueva que cuelgue de Mascota (ej. vacunas) tiene que moverse
 * también en esta transacción, o la base rechaza el borrado de la ficha duplicada.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!puedeVerFichas(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = unirSchema.safeParse(await req.json());
  if (!parsed.success || parsed.data.destinoId === id) {
    return NextResponse.json({ error: "Elegí otra mascota para unir" }, { status: 400 });
  }

  const [origen, destino] = await Promise.all([
    prisma.mascota.findUnique({ where: { id } }),
    prisma.mascota.findUnique({ where: { id: parsed.data.destinoId } }),
  ]);
  if (!origen || !destino) {
    return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });
  }
  if (origen.tutorId !== destino.tutorId) {
    return NextResponse.json({ error: "Solo se pueden unir mascotas del mismo cliente" }, { status: 400 });
  }

  const completar: Record<string, unknown> = {};
  for (const campo of CAMPOS_RESEÑA) {
    if (destino[campo] == null && origen[campo] != null) completar[campo] = origen[campo];
  }

  await prisma.$transaction([
    prisma.turno.updateMany({ where: { mascotaId: id }, data: { mascotaId: destino.id } }),
    prisma.consulta.updateMany({ where: { mascotaId: id }, data: { mascotaId: destino.id } }),
    prisma.mascota.update({ where: { id: destino.id }, data: completar }),
    prisma.mascota.delete({ where: { id } }),
  ]);

  return NextResponse.json({ mascotaId: destino.id });
}
