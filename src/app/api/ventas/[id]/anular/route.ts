import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";
import { anularVenta } from "@/lib/ventas";
import { respuestaDeError } from "@/lib/errorNegocio";

const anularSchema = z.object({ motivo: z.string() });

// POST: anular una venta (motivo obligatorio). Permiso propio: "anular".
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "anular")) {
    return NextResponse.json({ error: "No tenés permiso para anular ventas" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = anularSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Falta el motivo" }, { status: 400 });
  }
  try {
    const venta = await anularVenta(prisma, { ventaId: id, motivo: parsed.data.motivo }, nombreUsuario(session));
    return NextResponse.json({ venta });
  } catch (err) {
    return respuestaDeError(err);
  }
}
