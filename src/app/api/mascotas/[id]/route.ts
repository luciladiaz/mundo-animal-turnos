import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { puedeVerFichas } from "@/lib/autorizacion";
import { claveNombreMascota, limpiarNombre } from "@/lib/fichas";
import { datosMascotaSchema } from "@/lib/validacionFichas";

// GET: ficha de la mascota con su tutor, sus hermanas (para "unir") y sus turnos.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!puedeVerFichas(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const mascota = await prisma.mascota.findUnique({
    where: { id },
    include: {
      tutor: {
        select: {
          id: true,
          nombre: true,
          telefono: true,
          mascotas: { select: { id: true, nombre: true }, orderBy: { nombre: "asc" } },
        },
      },
      turnos: {
        include: { servicio: { select: { nombre: true } } },
        orderBy: [{ fecha: "desc" }, { horaInicio: "desc" }],
      },
    },
  });
  if (!mascota) {
    return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });
  }
  return NextResponse.json({ mascota });
}

// PATCH: editar la reseña de la mascota.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!puedeVerFichas(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = datosMascotaSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { nombre, ...datos } = parsed.data;

  const actual = await prisma.mascota.findUnique({ where: { id }, select: { tutorId: true } });
  if (!actual) {
    return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });
  }

  const nombreClave = claveNombreMascota(nombre);
  const repetida = await prisma.mascota.findFirst({
    where: { tutorId: actual.tutorId, nombreClave, id: { not: id } },
    select: { id: true },
  });
  if (repetida) {
    return NextResponse.json(
      { error: "Este cliente ya tiene otra mascota con ese nombre. Si es la misma, usá \"Unir con otra mascota\"." },
      { status: 409 }
    );
  }

  const mascota = await prisma.mascota.update({
    where: { id },
    data: { ...datos, nombre: limpiarNombre(nombre), nombreClave },
  });
  return NextResponse.json({ mascota });
}
