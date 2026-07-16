import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  ESTADOS_OCUPAN_HORARIO,
  calcularHoraFin,
  getFechaHoyArgentina,
  getHoraAhoraArgentina,
  haySolapamiento,
  horaAMinutos,
} from "@/lib/disponibilidad";
import { enviarConfirmacionCliente, enviarNotificacionAdmin } from "@/lib/email";

const crearTurnoSchema = z.object({
  servicioId: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  clienteNombre: z.string().min(1),
  clienteTelefono: z.string().min(1),
  clienteEmail: z.string().email().optional().or(z.literal("")),
  mascotaNombre: z.string().min(1),
  mascotaEspecie: z.string().optional(),
  notas: z.string().optional(),
});

// Error específico para poder distinguir "conflicto de horario" de otros errores dentro de la transacción.
class SlotNoDisponibleError extends Error {}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = crearTurnoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const datos = parsed.data;

  const servicio = await prisma.servicio.findUnique({ where: { id: datos.servicioId } });
  if (!servicio || !servicio.activo) {
    return NextResponse.json({ error: "El servicio elegido ya no está disponible" }, { status: 404 });
  }

  // No permitir reservar en el pasado.
  const hoy = getFechaHoyArgentina();
  if (datos.fecha < hoy) {
    return NextResponse.json({ error: "No se puede reservar una fecha pasada" }, { status: 400 });
  }
  if (datos.fecha === hoy && horaAMinutos(datos.horaInicio) < horaAMinutos(getHoraAhoraArgentina())) {
    return NextResponse.json({ error: "Ese horario ya pasó, elegí otro" }, { status: 400 });
  }

  const horaFin = calcularHoraFin(datos.horaInicio, servicio.duracionMinutos);

  try {
    const turno = await prisma.$transaction(async (tx) => {
      const configuracion = await tx.configuracionNegocio.findFirst();
      const bufferMin = configuracion?.bufferMinutos ?? 10;

      // Re-chequeo de solapamiento DENTRO de la transacción, justo antes de crear,
      // para minimizar la ventana de carrera si dos personas reservan a la vez.
      const turnosDelDia = await tx.turno.findMany({
        where: { fecha: datos.fecha, estado: { in: [...ESTADOS_OCUPAN_HORARIO] } },
        select: { horaInicio: true, horaFin: true },
      });

      if (haySolapamiento(datos.horaInicio, horaFin, turnosDelDia, bufferMin)) {
        throw new SlotNoDisponibleError();
      }

      return tx.turno.create({
        data: {
          servicioId: datos.servicioId,
          fecha: datos.fecha,
          horaInicio: datos.horaInicio,
          horaFin,
          clienteNombre: datos.clienteNombre,
          clienteTelefono: datos.clienteTelefono,
          clienteEmail: datos.clienteEmail || null,
          mascotaNombre: datos.mascotaNombre,
          mascotaEspecie: datos.mascotaEspecie || null,
          notas: datos.notas || null,
        },
      });
    });

    // Los emails van fuera de la transacción y nunca deben hacer fallar la reserva ya confirmada.
    const configuracion = await prisma.configuracionNegocio.findFirst();
    const datosEmail = {
      clienteNombre: datos.clienteNombre,
      clienteEmail: datos.clienteEmail || null,
      mascotaNombre: datos.mascotaNombre,
      servicioNombre: servicio.nombre,
      fecha: datos.fecha,
      horaInicio: datos.horaInicio,
      horaFin,
      negocioNombre: configuracion?.nombre ?? "Mundo Animal",
      negocioTelefono: configuracion?.telefono,
      negocioDireccion: configuracion?.direccion,
    };
    await enviarConfirmacionCliente(datosEmail);
    const adminEmail = process.env.ADMIN_NOTIFICACION_EMAIL;
    if (adminEmail) await enviarNotificacionAdmin(adminEmail, datosEmail);

    return NextResponse.json({ turno }, { status: 201 });
  } catch (err) {
    if (err instanceof SlotNoDisponibleError) {
      return NextResponse.json(
        { error: "Ese horario ya no está disponible, elegí otro" },
        { status: 409 }
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Error de base de datos creando turno:", err);
      return NextResponse.json({ error: "No se pudo crear el turno, intentá de nuevo" }, { status: 500 });
    }
    console.error("Error inesperado creando turno:", err);
    return NextResponse.json({ error: "Error inesperado, intentá de nuevo" }, { status: 500 });
  }
}

// GET: listado de turnos para el admin (protegido), con filtro opcional por fecha o rango.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const where: Prisma.TurnoWhereInput = {};
  if (fecha) {
    where.fecha = fecha;
  } else if (desde && hasta) {
    where.fecha = { gte: desde, lte: hasta };
  }

  const turnos = await prisma.turno.findMany({
    where,
    include: { servicio: true },
    orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
  });

  return NextResponse.json({ turnos });
}
