import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";
import { agregarParte, parteSchema } from "@/lib/internaciones";
import { respuestaDeError } from "@/lib/errorNegocio";

// POST: nuevo parte de evolución (solo veterinario).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = parteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  try {
    const parte = await agregarParte(prisma, id, parsed.data, nombreUsuario(session));
    return NextResponse.json({ parte }, { status: 201 });
  } catch (err) {
    return respuestaDeError(err);
  }
}
