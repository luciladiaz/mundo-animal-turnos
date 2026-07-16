// Lógica central de disponibilidad de turnos — sin solapamientos.
//
// Todo el sistema opera en una sola zona horaria fija (Argentina, sin horario
// de verano desde 2009), así que se evita a propósito trabajar con objetos
// Date/UTC para horarios de turnos: fechas y horas se manejan como strings
// "YYYY-MM-DD" / "HH:mm" en hora de pared de Argentina. Esto elimina de raíz
// una categoría entera de bugs de conversión de zona horaria.

export const TIMEZONE = "America/Argentina/Buenos_Aires";

// Un turno bloquea su horario mientras no esté cancelado — pendiente de confirmar
// también cuenta como "ocupado" (si no, dos personas podrían reservar el mismo horario
// mientras el primero espera confirmación).
export const ESTADOS_OCUPAN_HORARIO = ["PENDIENTE", "CONFIRMADO", "COMPLETADO"] as const;

export interface BloqueHorario {
  horaInicio: string; // "09:00"
  horaFin: string; // "13:00"
}

export interface TurnoOcupado {
  horaInicio: string;
  horaFin: string;
}

/** "09:30" -> 570 (minutos desde medianoche) */
export function horaAMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 570 -> "09:30" */
export function minutosAHora(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Fecha de hoy en Argentina, formato "YYYY-MM-DD" (no depende de la zona horaria del servidor). */
export function getFechaHoyArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Hora actual en Argentina, formato "HH:mm". */
export function getHoraAhoraArgentina(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/** Día de semana (0=domingo ... 6=sábado) de una fecha "YYYY-MM-DD", en Argentina. */
export function getDiaSemana(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  // Mediodía UTC evita cualquier problema de borde de día por redondeo.
  const fechaAlMediodia = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dia = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
  }).format(fechaAlMediodia);
  const mapa: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return mapa[dia];
}

/** Suma (o resta) días a una fecha "YYYY-MM-DD" usando aritmética UTC pura (sin horas de por medio, sin DST). */
export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + dias);
  return date.toISOString().slice(0, 10);
}

export function calcularHoraFin(horaInicio: string, duracionMinutos: number): string {
  return minutosAHora(horaAMinutos(horaInicio) + duracionMinutos);
}

/**
 * Dos turnos "chocan" si no queda al menos `bufferMin` minutos de separación
 * entre el fin de uno y el inicio del otro, sin importar el orden.
 */
function seSuperponen(
  aInicio: number,
  aFin: number,
  bInicio: number,
  bFin: number,
  bufferMin: number
): boolean {
  return !(aFin + bufferMin <= bInicio || bFin + bufferMin <= aInicio);
}

/**
 * Genera los horarios de inicio disponibles para un servicio en un día dado,
 * combinando los bloques de atención, los turnos ya ocupados y el buffer
 * configurado. No filtra por fecha pasada/futura — eso lo hace el caller
 * pasando `horaMinima` cuando la fecha consultada es "hoy".
 */
export function generarSlotsDisponibles(params: {
  bloques: BloqueHorario[];
  turnosOcupados: TurnoOcupado[];
  duracionServicioMin: number;
  bufferMin: number;
  granularidadMin?: number;
  horaMinima?: string;
}): string[] {
  const {
    bloques,
    turnosOcupados,
    duracionServicioMin,
    bufferMin,
    granularidadMin = 15,
    horaMinima,
  } = params;

  const ocupados = turnosOcupados.map((t) => ({
    inicio: horaAMinutos(t.horaInicio),
    fin: horaAMinutos(t.horaFin),
  }));
  const minimoMin = horaMinima ? horaAMinutos(horaMinima) : undefined;

  const disponibles: string[] = [];

  for (const bloque of bloques) {
    const inicioBloque = horaAMinutos(bloque.horaInicio);
    const finBloque = horaAMinutos(bloque.horaFin);

    for (
      let slotInicio = inicioBloque;
      slotInicio + duracionServicioMin <= finBloque;
      slotInicio += granularidadMin
    ) {
      if (minimoMin !== undefined && slotInicio < minimoMin) continue;

      const slotFin = slotInicio + duracionServicioMin;
      const chocaConAlguno = ocupados.some((o) =>
        seSuperponen(slotInicio, slotFin, o.inicio, o.fin, bufferMin)
      );
      if (chocaConAlguno) continue;

      disponibles.push(minutosAHora(slotInicio));
    }
  }

  return disponibles;
}

/** Devuelve true si un turno nuevo (horaInicio/horaFin) choca con alguno de los turnos existentes. */
export function haySolapamiento(
  nuevoInicio: string,
  nuevoFin: string,
  turnosExistentes: TurnoOcupado[],
  bufferMin: number
): boolean {
  const a = horaAMinutos(nuevoInicio);
  const b = horaAMinutos(nuevoFin);
  return turnosExistentes.some((t) =>
    seSuperponen(a, b, horaAMinutos(t.horaInicio), horaAMinutos(t.horaFin), bufferMin)
  );
}
