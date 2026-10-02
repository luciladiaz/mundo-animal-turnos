import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { controlarCoherencia } from "@/lib/stock";

// GET: control de coherencia del stock. Lo normal es { ok: true }; si no, lista qué no cuadra.
export async function GET() {
  const session = await auth();
  if (!tienePermiso(session, "stock")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const resultado = await controlarCoherencia(prisma);
  return NextResponse.json({ ok: resultado.lotes.length === 0 && resultado.productos.length === 0, ...resultado });
}
