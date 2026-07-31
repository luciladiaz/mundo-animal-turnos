import { prisma } from "@/lib/prisma";
import { getFechaHoyArgentina } from "@/lib/disponibilidad";
import LandingTabs from "@/components/LandingTabs";

export const dynamic = "force-dynamic";

const NOMBRES_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default async function LandingPage() {
  const [configuracion, servicios, bloques, diasCerrados] = await Promise.all([
    prisma.configuracionNegocio.findFirst(),
    prisma.servicio.findMany({ where: { activo: true }, orderBy: { createdAt: "asc" } }),
    prisma.horarioBloque.findMany(),
    prisma.diaCerrado.findMany({ select: { fecha: true } }),
  ]);

  const negocioNombre = configuracion?.nombre ?? "Mundo Animal";

  // Agrupa los bloques de horario por día para mostrarlos como "Lunes a Viernes 9 a 13 y 15 a 19".
  const bloquesPorDia = new Map<number, { horaInicio: string; horaFin: string }[]>();
  bloques.forEach((b) => {
    const lista = bloquesPorDia.get(b.diaSemana) ?? [];
    lista.push({ horaInicio: b.horaInicio, horaFin: b.horaFin });
    bloquesPorDia.set(b.diaSemana, lista);
  });
  const horarioTexto = NOMBRES_DIA.map((nombre, dia) => {
    const bloquesDia = bloquesPorDia.get(dia);
    if (!bloquesDia || bloquesDia.length === 0) return null;
    return `${nombre}: ${bloquesDia.map((b) => `${b.horaInicio} a ${b.horaFin}`).join(" y ")}`;
  }).filter((linea): linea is string => linea !== null);

  return (
    <LandingTabs
      negocioNombre={negocioNombre}
      logoUrl={configuracion?.logoUrl ?? null}
      direccion={configuracion?.direccion ?? null}
      telefono={configuracion?.telefono ?? null}
      horarioTexto={horarioTexto}
      servicios={servicios}
      bloques={bloques}
      diasCerrados={diasCerrados.map((d) => d.fecha)}
      fechaHoy={getFechaHoyArgentina()}
    />
  );
}
