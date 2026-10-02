import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

// GET: internación completa — partes con nota clínica y hoja de medicación. Solo veterinario.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const internacion = await prisma.internacion.findUnique({
    where: { id },
    include: {
      mascota: { select: { id: true, nombre: true, especie: true, alertas: true, tutor: { select: { id: true, nombre: true, telefono: true } } } },
      partes: { orderBy: { createdAt: "desc" } },
      medicaciones: {
        include: { tomas: { orderBy: { administradaEn: "desc" } } },
        orderBy: [{ activa: "desc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!internacion) return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  return NextResponse.json({ internacion });
}
