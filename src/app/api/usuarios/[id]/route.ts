import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { esAdmin } from "@/lib/autorizacion";

/** true si, sacando a `id`, no quedaría ningún admin activo (para no bloquear el acceso a todo el panel). */
async function esUltimoAdminActivo(id: string): Promise<boolean> {
  const otrosAdminsActivos = await prisma.adminUser.count({
    where: { id: { not: id }, rol: "admin", activo: true },
  });
  return otrosAdminsActivos === 0;
}

const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(1).optional(),
  rol: z.enum(["admin", "secretaria"]).optional(),
  activo: z.boolean().optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!esAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json();
  const parsed = actualizarUsuarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { nombre, rol, activo, password } = parsed.data;

  const usuarioExistente = await prisma.adminUser.findUnique({ where: { id } });
  if (!usuarioExistente) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const dejariaSinAdmin =
    ((rol && rol !== "admin") || activo === false) &&
    usuarioExistente.rol === "admin" &&
    usuarioExistente.activo &&
    (await esUltimoAdminActivo(id));
  if (dejariaSinAdmin) {
    return NextResponse.json(
      { error: "No se puede dejar sin ningún administrador activo" },
      { status: 400 }
    );
  }

  const data: Prisma.AdminUserUpdateInput = {};
  if (nombre !== undefined) data.nombre = nombre;
  if (rol !== undefined) data.rol = rol;
  if (activo !== undefined) data.activo = activo;
  if (password !== undefined) data.passwordHash = await bcrypt.hash(password, 10);

  const usuario = await prisma.adminUser.update({
    where: { id },
    data,
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
  });
  return NextResponse.json({ usuario });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!esAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;

  const usuarioExistente = await prisma.adminUser.findUnique({ where: { id } });
  if (!usuarioExistente) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (usuarioExistente.rol === "admin" && usuarioExistente.activo && (await esUltimoAdminActivo(id))) {
    return NextResponse.json(
      { error: "No se puede eliminar al único administrador activo" },
      { status: 400 }
    );
  }

  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
