import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";
import { registrarMovimientoManual } from "@/lib/caja";
import { respuestaDeError } from "@/lib/errorNegocio";

const movimientoSchema = z.object({
  tipo: z.enum(["GASTO", "INGRESO", "RETIRO"]),
  medioPagoId: z.string().min(1),
  monto: z.number().int().min(1, "El monto tiene que ser mayor a 0"),
  descripcion: z.string(),
});

// POST: gasto, ingreso o retiro en la caja abierta.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const parsed = movimientoSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  try {
    const movimiento = await registrarMovimientoManual(prisma, { ...parsed.data, usuario: nombreUsuario(session) });
    return NextResponse.json({ movimiento }, { status: 201 });
  } catch (err) {
    return respuestaDeError(err);
  }
}
