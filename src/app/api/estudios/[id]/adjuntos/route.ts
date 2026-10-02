import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";

// Mismos formatos y límite que los adjuntos de consultas (ver api/consultas/[id]/adjuntos).
const TIPOS_PERMITIDOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const TAMANIO_MAXIMO = 4 * 1024 * 1024;

// POST: adjuntar un archivo (foto o PDF) a un estudio de internación.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const estudio = await prisma.estudioInternacion.findUnique({ where: { id }, select: { id: true, internacionId: true } });
  if (!estudio) return NextResponse.json({ error: "Estudio no encontrado" }, { status: 404 });

  const archivo = (await req.formData()).get("archivo");
  if (!(archivo instanceof File)) return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  const extension = TIPOS_PERMITIDOS[archivo.type];
  if (!extension) return NextResponse.json({ error: "Formato no soportado. Usá fotos (JPG, PNG) o PDF." }, { status: 400 });
  if (archivo.size > TAMANIO_MAXIMO) return NextResponse.json({ error: "El archivo no puede pesar más de 4 MB" }, { status: 400 });

  const blob = await put(`internaciones/${estudio.internacionId}/${id}.${extension}`, archivo, { access: "public", addRandomSuffix: true });
  const adjunto = await prisma.adjuntoEstudio.create({
    data: {
      estudioId: id,
      nombre: archivo.name || `archivo.${extension}`,
      tipo: archivo.type,
      tamanio: archivo.size,
      url: blob.url,
      subidoPor: nombreUsuario(session),
    },
    select: { id: true, nombre: true, tipo: true, tamanio: true },
  });
  return NextResponse.json({ adjunto }, { status: 201 });
}
