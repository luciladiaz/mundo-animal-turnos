import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";
import { cerrarCaja } from "@/lib/caja";
import { respuestaDeError } from "@/lib/errorNegocio";

const cerrarSchema = z.object({
  conteos: z.array(z.object({ medioPagoId: z.string().min(1), contado: z.number().int().min(0) })),
  observaciones: z.string().optional().nullable(),
});

// POST: cierre con lo contado en cada medio (lo esperado lo calcula el servidor).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const parsed = cerrarSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisá los montos contados" }, { status: 400 });
  }
  try {
    const caja = await cerrarCaja(prisma, { ...parsed.data, usuario: nombreUsuario(session) });
    return NextResponse.json({ caja });
  } catch (err) {
    return respuestaDeError(err);
  }
}
