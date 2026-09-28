import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

// GET: versiones anteriores de una consulta (la más reciente primero).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const cambios = await prisma.consultaCambio.findMany({
    where: { consultaId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ cambios });
}
