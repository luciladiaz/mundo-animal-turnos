import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { datosConsultaSchema, nombreUsuario } from "@/lib/consultas";

// GET: historia clínica de una mascota (más reciente primero). Solo admin y veterinarios.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const mascotaId = new URL(req.url).searchParams.get("mascotaId");
  if (!mascotaId) {
    return NextResponse.json({ error: "Falta la mascota" }, { status: 400 });
  }

  const consultas = await prisma.consulta.findMany({
    where: { mascotaId },
    include: {
      // La URL del archivo no se manda: se descarga por /api/adjuntos/[id].
      adjuntos: { select: { id: true, nombre: true, tipo: true, tamanio: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { cambios: true } },
    },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ consultas });
}

const crearConsultaSchema = datosConsultaSchema.extend({
  mascotaId: z.string().min(1),
  turnoId: z.string().optional().nullable(),
});

// POST: nueva consulta. Si trae peso, se actualiza también el peso de la ficha.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = crearConsultaSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { mascotaId, turnoId, ...datos } = parsed.data;

  const mascota = await prisma.mascota.findUnique({ where: { id: mascotaId }, select: { id: true } });
  if (!mascota) {
    return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });
  }

  const consulta = await prisma.$transaction(async (tx) => {
    const creada = await tx.consulta.create({
      data: { ...datos, mascotaId, turnoId: turnoId || null, autorNombre: nombreUsuario(session) },
    });
    if (datos.pesoKg != null) {
      await tx.mascota.update({ where: { id: mascotaId }, data: { pesoKg: datos.pesoKg } });
    }
    return creada;
  });

  return NextResponse.json({ consulta }, { status: 201 });
}
