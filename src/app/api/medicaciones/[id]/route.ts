import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";
import { suspenderMedicacion } from "@/lib/internaciones";
import { respuestaDeError } from "@/lib/errorNegocio";

// PATCH: suspender una medicación de la hoja (solo veterinario). No se borra: queda el historial de tomas.
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const medicacion = await suspenderMedicacion(prisma, id, nombreUsuario(session));
    return NextResponse.json({ medicacion });
  } catch (err) {
    return respuestaDeError(err);
  }
}
