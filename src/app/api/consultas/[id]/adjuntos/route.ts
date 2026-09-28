import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";

const TIPOS_PERMITIDOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

// Vercel corta los pedidos de más de 4,5 MB; las fotos se achican en el navegador antes
// de subirlas (ver HistoriaClinica.tsx), así que este límite en la práctica solo lo tocan PDFs.
const TAMANIO_MAXIMO = 4 * 1024 * 1024;

// POST: adjuntar un archivo (análisis, radiografía, receta) a una consulta.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const consulta = await prisma.consulta.findUnique({ where: { id }, select: { id: true, mascotaId: true } });
  if (!consulta) {
    return NextResponse.json({ error: "Consulta no encontrada" }, { status: 404 });
  }

  const formData = await req.formData();
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }
  const extension = TIPOS_PERMITIDOS[archivo.type];
  if (!extension) {
    return NextResponse.json({ error: "Formato no soportado. Usá fotos (JPG, PNG) o PDF." }, { status: 400 });
  }
  if (archivo.size > TAMANIO_MAXIMO) {
    return NextResponse.json({ error: "El archivo no puede pesar más de 4 MB" }, { status: 400 });
  }

  // Nombre con sufijo aleatorio: la dirección del archivo no se puede adivinar, y además
  // nunca se le muestra al navegador (se descarga pasando por /api/adjuntos/[id]).
  const blob = await put(`historia/${consulta.mascotaId}/${id}.${extension}`, archivo, {
    access: "public",
    addRandomSuffix: true,
  });

  const adjunto = await prisma.adjuntoConsulta.create({
    data: {
      consultaId: id,
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
