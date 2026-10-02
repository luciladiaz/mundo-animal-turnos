import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";
import { ajustarStock, ingresarStock } from "@/lib/stock";
import { respuestaDeError } from "@/lib/errorNegocio";

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const operacionSchema = z.discriminatedUnion("accion", [
  // Ingreso de mercadería (permiso "stock").
  z.object({
    accion: z.literal("ingreso"),
    cantidad: z.number().int().min(1, "La cantidad tiene que ser mayor a 0"),
    codigoLote: z.string().optional().nullable(),
    vencimiento: fecha.optional().nullable(),
    motivo: z.string().optional().nullable(),
  }),
  // Ajuste manual con motivo (permiso "anular").
  z.object({
    accion: z.literal("ajuste"),
    cantidad: z.number().int().refine((n) => n !== 0, "El ajuste no puede ser 0"),
    loteId: z.string().optional().nullable(),
    motivo: z.string(),
  }),
]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  const parsed = operacionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const datos = parsed.data;
  if (datos.accion === "ingreso" && !tienePermiso(session, "stock")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (datos.accion === "ajuste" && !tienePermiso(session, "anular")) {
    return NextResponse.json({ error: "No tenés permiso para ajustar stock" }, { status: 403 });
  }
  try {
    await prisma.$transaction(
      (tx) =>
        datos.accion === "ingreso"
          ? ingresarStock(tx, {
              productoId: id,
              cantidad: datos.cantidad,
              tipo: "COMPRA",
              usuario: nombreUsuario(session),
              codigoLote: datos.codigoLote,
              vencimiento: datos.vencimiento,
              motivo: datos.motivo,
            })
          : ajustarStock(tx, {
              productoId: id,
              loteId: datos.loteId,
              cantidad: datos.cantidad,
              motivo: datos.motivo,
              usuario: nombreUsuario(session),
            }),
      { timeout: 15000 }
    );
    const producto = await prisma.producto.findUnique({ where: { id }, select: { stock: true } });
    return NextResponse.json({ stock: producto?.stock });
  } catch (err) {
    return respuestaDeError(err);
  }
}
