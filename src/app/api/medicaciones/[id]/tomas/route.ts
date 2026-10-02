import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";
import { registrarToma } from "@/lib/internaciones";
import { respuestaDeError } from "@/lib/errorNegocio";

const schema = z.object({ observaciones: z.string().optional().nullable() });

// POST: "la di ahora" — registra la toma con quién y cuándo (solo veterinario).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    const toma = await registrarToma(prisma, id, parsed.data.observaciones ?? null, nombreUsuario(session));
    return NextResponse.json({ toma }, { status: 201 });
  } catch (err) {
    return respuestaDeError(err);
  }
}
