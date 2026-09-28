import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { puedeVerFichas, tienePermiso } from "@/lib/autorizacion";
import { datosAplicacionSchema } from "@/lib/planSanitario";
import { registrarAplicacion } from "@/lib/aplicaciones";
import { nombreUsuario } from "@/lib/consultas";

// GET: carnet de vacunas y desparasitaciones de una mascota (más reciente primero).
// No es historia clínica: lo ve cualquiera que pueda ver la ficha.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!puedeVerFichas(session) && !tienePermiso(session, "recordatorios")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const mascotaId = new URL(req.url).searchParams.get("mascotaId");
  if (!mascotaId) {
    return NextResponse.json({ error: "Falta la mascota" }, { status: 400 });
  }

  const aplicaciones = await prisma.aplicacion.findMany({
    where: { mascotaId },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ aplicaciones });
}

const crearSchema = datosAplicacionSchema.extend({ mascotaId: z.string().min(1) });

// POST: registrar una vacuna o desparasitación (ej. una vieja del carnet en papel).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = crearSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const mascota = await prisma.mascota.findUnique({ where: { id: parsed.data.mascotaId }, select: { id: true } });
  if (!mascota) {
    return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });
  }

  const aplicacion = await prisma.$transaction((tx) =>
    registrarAplicacion(tx, { ...parsed.data, aplicadoPor: nombreUsuario(session) })
  );
  return NextResponse.json({ aplicacion }, { status: 201 });
}
