import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";

const actualizarSchema = z.object({
  // Solo el veterinario cambia la fecha.
  proximaFecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .nullable()
    .optional(),
  // Veterinario o secretaria: "ya le mandé el recordatorio" / "no recordar más".
  recordatorioEnviado: z.literal(true).optional(),
  resuelta: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const esVeterinario = tienePermiso(session, "historia");
  const esRecordatorios = tienePermiso(session, "recordatorios");
  if (!esVeterinario && !esRecordatorios) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = actualizarSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { proximaFecha, recordatorioEnviado, resuelta } = parsed.data;
  if (proximaFecha !== undefined && !esVeterinario) {
    return NextResponse.json({ error: "Solo el veterinario puede cambiar la fecha" }, { status: 403 });
  }

  const existe = await prisma.aplicacion.findUnique({ where: { id }, select: { id: true } });
  if (!existe) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const aplicacion = await prisma.aplicacion.update({
    where: { id },
    data: {
      ...(proximaFecha !== undefined ? { proximaFecha, recordatorioEnviado: null, recordatorioEnviadoPor: null } : {}),
      ...(resuelta !== undefined ? { resuelta } : {}),
      ...(recordatorioEnviado ? { recordatorioEnviado: new Date(), recordatorioEnviadoPor: nombreUsuario(session) } : {}),
    },
  });
  return NextResponse.json({ aplicacion });
}
