import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { esAdmin } from "@/lib/autorizacion";

const PESTAÑAS = ["turnos", "servicios", "configuracion"] as const;

// GET: listado de usuarios (solo esAdmin).
export async function GET() {
  const session = await auth();
  if (!esAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const usuarios = await prisma.adminUser.findMany({
    select: { id: true, nombre: true, email: true, esAdmin: true, permisos: true, activo: true },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json({ usuarios });
}

const crearUsuarioSchema = z.object({
  nombre: z.string().min(1),
  email: z
    .string()
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
    .regex(/^\S+$/, "El nombre de usuario no puede tener espacios"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  esAdmin: z.boolean(),
  permisos: z.array(z.enum(PESTAÑAS)).default([]),
});

// POST: crear un usuario nuevo (solo esAdmin).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!esAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = crearUsuarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { nombre, email, password, esAdmin: nuevoEsAdmin, permisos } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const usuario = await prisma.adminUser.create({
      data: { nombre, email, passwordHash, esAdmin: nuevoEsAdmin, permisos: nuevoEsAdmin ? [] : permisos },
      select: { id: true, nombre: true, email: true, esAdmin: true, permisos: true, activo: true },
    });
    return NextResponse.json({ usuario }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario con ese nombre de usuario" }, { status: 409 });
    }
    console.error("Error creando usuario:", err);
    return NextResponse.json({ error: "No se pudo crear el usuario" }, { status: 500 });
  }
}
