import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

// GET: categorías de productos (con cuántos productos tiene cada una).
export async function GET() {
  const session = await auth();
  if (!tienePermiso(session, "stock") && !tienePermiso(session, "ventas")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const categorias = await prisma.categoriaProducto.findMany({
    include: { _count: { select: { productos: true } } },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json({ categorias });
}

const crearSchema = z.object({ nombre: z.string().trim().min(1, "Falta el nombre") });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "stock")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const parsed = crearSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const existe = await prisma.categoriaProducto.findFirst({
    where: { nombre: { equals: parsed.data.nombre, mode: "insensitive" } },
  });
  if (existe) return NextResponse.json({ error: "Ya existe esa categoría" }, { status: 409 });
  const categoria = await prisma.categoriaProducto.create({ data: { nombre: parsed.data.nombre } });
  return NextResponse.json({ categoria }, { status: 201 });
}
