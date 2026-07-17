import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

const EXTENSIONES_PERMITIDAS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

// Guarda el logo en Vercel Blob (storage persistente) — el filesystem local de
// Vercel es efímero (se borra en cada deploy/reinicio de función), así que un
// archivo escrito en /public/uploads no sobrevive en producción.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "configuracion")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("logo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }

  const extension = EXTENSIONES_PERMITIDAS[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Formato no soportado. Usá PNG, JPG, WEBP o SVG." },
      { status: 400 }
    );
  }

  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo no puede pesar más de 3MB" }, { status: 400 });
  }

  const nombreArchivo = `logos/logo-${Date.now()}.${extension}`;
  const blob = await put(nombreArchivo, file, {
    access: "public",
    addRandomSuffix: false,
  });

  const logoUrl = blob.url;

  const existente = await prisma.configuracionNegocio.findFirst();
  const configuracion = existente
    ? await prisma.configuracionNegocio.update({ where: { id: existente.id }, data: { logoUrl } })
    : await prisma.configuracionNegocio.create({ data: { nombre: "Mi negocio", logoUrl } });

  return NextResponse.json({ configuracion });
}
