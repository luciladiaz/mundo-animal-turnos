import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";
import { crearVenta, nuevaVentaSchema } from "@/lib/ventas";
import { respuestaDeError } from "@/lib/errorNegocio";

// GET: ventas de una caja (por defecto, la abierta). Incluye las anuladas.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  let cajaId = new URL(req.url).searchParams.get("cajaId");
  if (!cajaId) {
    const abierta = await prisma.caja.findFirst({ where: { estado: "ABIERTA" }, select: { id: true } });
    if (!abierta) return NextResponse.json({ ventas: [] });
    cajaId = abierta.id;
  }
  const ventas = await prisma.venta.findMany({
    where: { cajaId },
    include: {
      items: { select: { id: true, descripcion: true, cantidad: true, precioLista: true, precioUnitario: true, subtotal: true } },
      pagos: { include: { medioPago: { select: { nombre: true } } } },
      tutor: { select: { id: true, nombre: true } },
    },
    orderBy: { numero: "desc" },
  });
  return NextResponse.json({ ventas });
}

// POST: registrar una venta (todo en una transacción, ver src/lib/ventas.ts).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const parsed = nuevaVentaSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  try {
    const venta = await crearVenta(prisma, parsed.data, nombreUsuario(session));
    return NextResponse.json({ venta }, { status: 201 });
  } catch (err) {
    return respuestaDeError(err);
  }
}
