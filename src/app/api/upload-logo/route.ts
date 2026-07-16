import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { esAdmin } from "@/lib/autorizacion";

const EXTENSIONES_PERMITIDAS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

// Guarda el logo en /public/uploads. Simple y suficiente para un solo negocio;
// si en el futuro esto sirve a múltiples clientes, migrar a un storage real (S3/Supabase Storage).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!esAdmin(session)) {
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

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const nombreArchivo = `logo-${Date.now()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, nombreArchivo), bytes);

  const logoUrl = `/uploads/${nombreArchivo}`;

  const existente = await prisma.configuracionNegocio.findFirst();
  const configuracion = existente
    ? await prisma.configuracionNegocio.update({ where: { id: existente.id }, data: { logoUrl } })
    : await prisma.configuracionNegocio.create({ data: { nombre: "Mi negocio", logoUrl } });

  return NextResponse.json({ configuracion });
}
