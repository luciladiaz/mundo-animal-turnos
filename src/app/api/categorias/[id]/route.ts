import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

const editarSchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  activa: z.boolean().optional(),
});

// PATCH: renombrar o desactivar una categoría (no se borra: tiene productos y ventas).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "stock")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = editarSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  if (parsed.data.nombre) {
    const otra = await prisma.categoriaProducto.findFirst({
      where: { nombre: { equals: parsed.data.nombre, mode: "insensitive" }, id: { not: id } },
    });
    if (otra) return NextResponse.json({ error: "Ya existe esa categoría" }, { status: 409 });
  }
  const categoria = await prisma.categoriaProducto.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ categoria });
}
