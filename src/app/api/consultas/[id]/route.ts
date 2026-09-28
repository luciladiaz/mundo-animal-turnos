import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { CAMPOS_CONSULTA, datosConsultaSchema, nombreUsuario } from "@/lib/consultas";

// PATCH: corregir una consulta. Antes de pisarla se guarda la versión anterior en
// ConsultaCambio (quién, cuándo y qué decía), así la historia nunca pierde información.
// No hay DELETE a propósito: una consulta no se borra.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = datosConsultaSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const datos = parsed.data;

  const actual = await prisma.consulta.findUnique({ where: { id } });
  if (!actual) {
    return NextResponse.json({ error: "Consulta no encontrada" }, { status: 404 });
  }

  const anteriores: Record<string, string | number | null> = {};
  let huboCambios = false;
  for (const campo of CAMPOS_CONSULTA) {
    anteriores[campo] = actual[campo];
    if ((actual[campo] ?? null) !== (datos[campo] ?? null)) huboCambios = true;
  }
  if (!huboCambios) {
    return NextResponse.json({ consulta: actual });
  }

  const consulta = await prisma.$transaction(async (tx) => {
    await tx.consultaCambio.create({
      data: { consultaId: id, datosAnteriores: anteriores, editadoPor: nombreUsuario(session) },
    });
    const editada = await tx.consulta.update({ where: { id }, data: datos });

    // Si se corrigió el peso de la consulta más reciente, la ficha muestra el nuevo.
    if (datos.pesoKg != null && datos.pesoKg !== actual.pesoKg) {
      const ultima = await tx.consulta.findFirst({
        where: { mascotaId: actual.mascotaId, pesoKg: { not: null } },
        orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
        select: { id: true },
      });
      if (ultima?.id === id) {
        await tx.mascota.update({ where: { id: actual.mascotaId }, data: { pesoKg: datos.pesoKg } });
      }
    }
    return editada;
  });

  return NextResponse.json({ consulta });
}
