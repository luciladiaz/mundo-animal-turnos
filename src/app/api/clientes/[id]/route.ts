import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { claveTelefono } from "@/lib/fichas";
import { datosTutorSchema } from "@/lib/validacionFichas";

// GET: ficha completa del tutor — datos, mascotas y todos sus turnos.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "clientes")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const cliente = await prisma.tutor.findUnique({
    where: { id },
    include: {
      mascotas: { orderBy: [{ fallecida: "asc" }, { nombre: "asc" }] },
      turnos: {
        include: { servicio: { select: { nombre: true } } },
        orderBy: [{ fecha: "desc" }, { horaInicio: "desc" }],
      },
    },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ cliente });
}

// PATCH: editar los datos del tutor.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "clientes")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = datosTutorSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { aceptaRecordatorios, ...datos } = parsed.data;

  const actual = await prisma.tutor.findUnique({ where: { id } });
  if (!actual) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const telefonoClave = claveTelefono(datos.telefono);
  if (!telefonoClave) {
    return NextResponse.json({ error: "El teléfono tiene que tener números" }, { status: 400 });
  }
  if (telefonoClave !== actual.telefonoClave) {
    const otro = await prisma.tutor.findUnique({ where: { telefonoClave }, select: { nombre: true } });
    if (otro) {
      return NextResponse.json({ error: `Ese teléfono ya es de otro cliente: ${otro.nombre}` }, { status: 409 });
    }
  }

  // La fecha del consentimiento se registra solo cuando cambia de "no" a "sí".
  const consentimiento =
    aceptaRecordatorios === undefined || aceptaRecordatorios === actual.aceptaRecordatorios
      ? {}
      : { aceptaRecordatorios, aceptaRecordatoriosFecha: aceptaRecordatorios ? new Date() : null };

  const cliente = await prisma.tutor.update({
    where: { id },
    data: { ...datos, telefonoClave, ...consentimiento },
  });
  return NextResponse.json({ cliente });
}
