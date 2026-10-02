import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";
import { abrirCaja, esperadoPorMedio } from "@/lib/caja";
import { respuestaDeError } from "@/lib/errorNegocio";

// GET: caja abierta (o null) con lo esperado por medio y sus movimientos manuales.
export async function GET() {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const caja = await prisma.caja.findFirst({ where: { estado: "ABIERTA" } });
  if (!caja) return NextResponse.json({ caja: null });

  const [resumen, manuales] = await Promise.all([
    esperadoPorMedio(prisma, caja.id),
    prisma.movimientoCaja.findMany({
      where: { cajaId: caja.id, tipo: { in: ["GASTO", "INGRESO", "RETIRO", "COBRO_CUENTA_CORRIENTE"] } },
      include: {
        medioPago: { select: { nombre: true } },
        pagoCuentaCorriente: { select: { tutor: { select: { id: true, nombre: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return NextResponse.json({ caja, resumen, movimientos: manuales });
}

const abrirSchema = z.object({ efectivoInicial: z.number().int().min(0) });

// POST: abrir la caja del día.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const parsed = abrirSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Efectivo inicial inválido" }, { status: 400 });
  }
  try {
    const caja = await abrirCaja(prisma, { efectivoInicial: parsed.data.efectivoInicial, usuario: nombreUsuario(session) });
    return NextResponse.json({ caja }, { status: 201 });
  } catch (err) {
    return respuestaDeError(err);
  }
}
