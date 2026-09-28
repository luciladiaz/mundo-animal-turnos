import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

// GET: ver/descargar un adjunto de la historia clínica, solo con permiso "historia".
// El archivo se sirve desde acá para que la dirección real del storage no circule.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const adjunto = await prisma.adjuntoConsulta.findUnique({ where: { id } });
  if (!adjunto) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  const archivo = await fetch(adjunto.url);
  if (!archivo.ok || !archivo.body) {
    return NextResponse.json({ error: "No se pudo abrir el archivo" }, { status: 502 });
  }

  return new NextResponse(archivo.body, {
    headers: {
      "Content-Type": adjunto.tipo,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(adjunto.nombre)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
