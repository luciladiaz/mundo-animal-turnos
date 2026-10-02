import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";
import { crearEstudio, estudioSchema } from "@/lib/internaciones";
import { respuestaDeError } from "@/lib/errorNegocio";

// POST: registrar un estudio de la internación (veterinario). Los archivos se suben aparte.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = estudioSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  try {
    const estudio = await crearEstudio(prisma, id, parsed.data, nombreUsuario(session));
    return NextResponse.json({ estudio }, { status: 201 });
  } catch (err) {
    return respuestaDeError(err);
  }
}
