import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { claveTelefono } from "@/lib/fichas";
import { datosTutorSchema } from "@/lib/validacionFichas";

// GET: buscador de la pestaña Clientes — por nombre del tutor, teléfono o nombre de mascota.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "clientes")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const digitos = q.replace(/\D/g, "");

  const where: Prisma.TutorWhereInput = q
    ? {
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { mascotas: { some: { nombre: { contains: q, mode: "insensitive" } } } },
          ...(digitos.length >= 3 ? [{ telefonoClave: { contains: digitos } }] : []),
        ],
      }
    : {};

  const clientes = await prisma.tutor.findMany({
    where,
    select: {
      id: true,
      nombre: true,
      telefono: true,
      mascotas: {
        select: { id: true, nombre: true, especie: true, alertas: true, fallecida: true },
        orderBy: { nombre: "asc" },
      },
      _count: { select: { turnos: true } },
    },
    orderBy: { nombre: "asc" },
    take: 60,
  });

  return NextResponse.json({ clientes });
}

// POST: alta manual de un cliente (el resto se crea solo al reservar turnos).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "clientes")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = datosTutorSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { aceptaRecordatorios, ...datos } = parsed.data;
  const telefonoClave = claveTelefono(datos.telefono);
  if (!telefonoClave) {
    return NextResponse.json({ error: "El teléfono tiene que tener números" }, { status: 400 });
  }

  const existente = await prisma.tutor.findUnique({ where: { telefonoClave }, select: { id: true, nombre: true } });
  if (existente) {
    return NextResponse.json(
      { error: `Ya existe un cliente con ese teléfono: ${existente.nombre}`, clienteId: existente.id },
      { status: 409 }
    );
  }

  const cliente = await prisma.tutor.create({
    data: {
      ...datos,
      telefonoClave,
      aceptaRecordatorios: aceptaRecordatorios ?? false,
      aceptaRecordatoriosFecha: aceptaRecordatorios ? new Date() : null,
    },
  });
  return NextResponse.json({ cliente }, { status: 201 });
}
