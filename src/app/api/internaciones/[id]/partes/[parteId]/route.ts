import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { esAdmin, puedeVerInternados } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";
import { editarParte, parteSchema } from "@/lib/internaciones";
import { respuestaDeError } from "@/lib/errorNegocio";

const enviadoSchema = z.object({ enviado: z.boolean() });

/**
 * PATCH con { enviado }: marcar/desmarcar "ya le mandé el parte a la familia" (secretaria o veterinario).
 * PATCH con { estado, parteFamilia, notaClinica }: corregir el parte (solo admin).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; parteId: string }> }) {
  const session = await auth();
  if (!puedeVerInternados(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id, parteId } = await params;
  const body = await req.json();
  const parte = await prisma.parteInternacion.findUnique({ where: { id: parteId }, select: { internacionId: true } });
  if (!parte || parte.internacionId !== id) return NextResponse.json({ error: "Parte no encontrado" }, { status: 404 });

  const marca = enviadoSchema.safeParse(body);
  if (marca.success) {
    await prisma.parteInternacion.update({
      where: { id: parteId },
      data: marca.data.enviado ? { enviadoEn: new Date(), enviadoPor: nombreUsuario(session) } : { enviadoEn: null, enviadoPor: null },
    });
    return NextResponse.json({ ok: true });
  }

  if (!esAdmin(session)) {
    return NextResponse.json({ error: "Solo los administradores pueden editar partes" }, { status: 403 });
  }
  const edicion = parteSchema.safeParse(body);
  if (!edicion.success) {
    return NextResponse.json({ error: edicion.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  try {
    const actualizado = await editarParte(prisma, parteId, edicion.data, nombreUsuario(session));
    return NextResponse.json({ parte: actualizado });
  } catch (err) {
    return respuestaDeError(err);
  }
}
