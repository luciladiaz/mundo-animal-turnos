import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { puedeVerInternados } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";

const schema = z.object({ enviado: z.boolean() });

// PATCH: marcar/desmarcar "ya le mandé el parte a la familia" (secretaria o veterinario).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; parteId: string }> }) {
  const session = await auth();
  if (!puedeVerInternados(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id, parteId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const parte = await prisma.parteInternacion.findUnique({ where: { id: parteId }, select: { internacionId: true } });
  if (!parte || parte.internacionId !== id) return NextResponse.json({ error: "Parte no encontrado" }, { status: 404 });
  await prisma.parteInternacion.update({
    where: { id: parteId },
    data: parsed.data.enviado
      ? { enviadoEn: new Date(), enviadoPor: nombreUsuario(session) }
      : { enviadoEn: null, enviadoPor: null },
  });
  return NextResponse.json({ ok: true });
}
