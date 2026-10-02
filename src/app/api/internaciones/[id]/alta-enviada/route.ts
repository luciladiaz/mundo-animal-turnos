import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { puedeVerInternados } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";

const schema = z.object({ enviado: z.boolean() });

// PATCH: marcar/desmarcar "ya le mandé las indicaciones del alta a la familia".
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!puedeVerInternados(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const internacion = await prisma.internacion.findUnique({ where: { id }, select: { estado: true } });
  if (!internacion || internacion.estado !== "ALTA") return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  await prisma.internacion.update({
    where: { id },
    data: parsed.data.enviado
      ? { altaEnviadaEn: new Date(), altaEnviadaPor: nombreUsuario(session) }
      : { altaEnviadaEn: null, altaEnviadaPor: null },
  });
  return NextResponse.json({ ok: true });
}
