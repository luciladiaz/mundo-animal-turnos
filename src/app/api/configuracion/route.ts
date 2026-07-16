import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { esAdmin } from "@/lib/autorizacion";

// GET: público — la página de reserva necesita el logo/colores/nombre para mostrarse con la marca del negocio.
export async function GET() {
  const configuracion = await prisma.configuracionNegocio.findFirst();
  return NextResponse.json({ configuracion });
}

const actualizarConfigSchema = z.object({
  nombre: z.string().min(1).optional(),
  logoUrl: z.string().optional().nullable(),
  colorPrimario: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  colorSecundario: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  bufferMinutos: z.number().int().nonnegative().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!esAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = actualizarConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const existente = await prisma.configuracionNegocio.findFirst();
  const configuracion = existente
    ? await prisma.configuracionNegocio.update({ where: { id: existente.id }, data: parsed.data })
    : await prisma.configuracionNegocio.create({
        data: { nombre: parsed.data.nombre ?? "Mi negocio", ...parsed.data },
      });

  return NextResponse.json({ configuracion });
}
