import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ESTADOS_OCUPAN_HORARIO, calcularHoraFin, haySolapamiento } from "@/lib/disponibilidad";
import { tienePermiso } from "@/lib/autorizacion";

const actualizarTurnoSchema = z.object({
  estado: z.enum(["PENDIENTE", "CONFIRMADO", "CANCELADO", "COMPLETADO"]).optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "turnos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = actualizarTurnoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const datos = parsed.data;

  const turnoActual = await prisma.turno.findUnique({ where: { id }, include: { servicio: true } });
  if (!turnoActual) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  // Reprogramación: si cambia fecha y/u hora, hay que revalidar disponibilidad.
  const seReprograma = datos.fecha !== undefined || datos.horaInicio !== undefined;
  if (seReprograma) {
    const nuevaFecha = datos.fecha ?? turnoActual.fecha;
    const nuevaHoraInicio = datos.horaInicio ?? turnoActual.horaInicio;
    const nuevaHoraFin = calcularHoraFin(nuevaHoraInicio, turnoActual.servicio.duracionMinutos);

    const configuracion = await prisma.configuracionNegocio.findFirst();
    const bufferMin = configuracion?.bufferMinutos ?? 10;

    const otrosTurnosDelDia = await prisma.turno.findMany({
      where: {
        fecha: nuevaFecha,
        estado: { in: [...ESTADOS_OCUPAN_HORARIO] },
        id: { not: id },
      },
      select: { horaInicio: true, horaFin: true },
    });

    if (haySolapamiento(nuevaHoraInicio, nuevaHoraFin, otrosTurnosDelDia, bufferMin)) {
      return NextResponse.json(
        { error: "Ese horario ya no está disponible, elegí otro" },
        { status: 409 }
      );
    }

    const turno = await prisma.turno.update({
      where: { id },
      data: {
        fecha: nuevaFecha,
        horaInicio: nuevaHoraInicio,
        horaFin: nuevaHoraFin,
        ...(datos.estado ? { estado: datos.estado } : {}),
      },
    });
    return NextResponse.json({ turno });
  }

  const turno = await prisma.turno.update({
    where: { id },
    data: { estado: datos.estado },
  });
  return NextResponse.json({ turno });
}
