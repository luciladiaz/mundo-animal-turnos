import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";
import { getFechaHoyArgentina, sumarDias } from "@/lib/disponibilidad";

// GET: vacunas/desparasitaciones vencidas o que vencen en los próximos 30 días.
// Es lo único "sanitario" que ve la secretaria: mascota, tutor, qué le toca y cuándo.
// No incluye nada de la historia clínica.
export async function GET() {
  const session = await auth();
  if (!tienePermiso(session, "recordatorios") && !tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const hasta = sumarDias(getFechaHoyArgentina(), 30);
  const pendientes = await prisma.aplicacion.findMany({
    where: {
      resuelta: false,
      proximaFecha: { not: null, lte: hasta },
      mascota: { fallecida: false },
    },
    select: {
      id: true,
      tipo: true,
      producto: true,
      proximaFecha: true,
      recordatorioEnviado: true,
      recordatorioEnviadoPor: true,
      mascota: {
        select: {
          id: true,
          nombre: true,
          tutor: { select: { id: true, nombre: true, telefono: true, aceptaRecordatorios: true } },
        },
      },
    },
    orderBy: { proximaFecha: "asc" },
  });

  const configuracion = await prisma.configuracionNegocio.findFirst({ select: { nombre: true } });
  return NextResponse.json({ pendientes, negocio: configuracion?.nombre ?? "la veterinaria" });
}
