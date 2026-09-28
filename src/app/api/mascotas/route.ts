import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { puedeVerFichas } from "@/lib/autorizacion";
import { claveNombreMascota, limpiarNombre } from "@/lib/fichas";
import { datosMascotaSchema } from "@/lib/validacionFichas";

const crearMascotaSchema = datosMascotaSchema.extend({ tutorId: z.string().min(1) });

// POST: agregar una mascota a la ficha de un tutor.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!puedeVerFichas(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = crearMascotaSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { tutorId, nombre, ...datos } = parsed.data;

  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId }, select: { id: true } });
  if (!tutor) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const nombreClave = claveNombreMascota(nombre);
  const repetida = await prisma.mascota.findFirst({ where: { tutorId, nombreClave }, select: { id: true } });
  if (repetida) {
    return NextResponse.json({ error: "Este cliente ya tiene una mascota con ese nombre" }, { status: 409 });
  }

  const mascota = await prisma.mascota.create({
    data: { ...datos, tutorId, nombre: limpiarNombre(nombre), nombreClave },
  });
  return NextResponse.json({ mascota }, { status: 201 });
}
