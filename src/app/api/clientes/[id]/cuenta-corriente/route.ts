import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";
import { cobrarCuentaCorriente, saldoCuentaCorriente } from "@/lib/ventas";
import { respuestaDeError } from "@/lib/errorNegocio";

// GET: saldo y movimientos de cuenta corriente del cliente.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const [saldo, ventas, pagos] = await Promise.all([
    saldoCuentaCorriente(prisma, id),
    prisma.venta.findMany({
      where: { tutorId: id },
      select: { id: true, numero: true, createdAt: true, total: true, pagado: true, estado: true, items: { select: { descripcion: true, cantidad: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.pagoCuentaCorriente.findMany({
      where: { tutorId: id },
      include: { medioPago: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return NextResponse.json({ saldo, ventas, pagos });
}

const cobroSchema = z.object({ medioPagoId: z.string().min(1), monto: z.number().int().min(1, "El monto tiene que ser mayor a 0") });

// POST: el cliente paga (todo o parte de) su deuda. Entra a la caja abierta.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = cobroSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  try {
    const pago = await cobrarCuentaCorriente(prisma, { tutorId: id, ...parsed.data }, nombreUsuario(session));
    return NextResponse.json({ pago }, { status: 201 });
  } catch (err) {
    return respuestaDeError(err);
  }
}
