// Textos de estado de internación, sin dependencias de servidor (se usan en el navegador).

export type EstadoParte = "ESTABLE" | "OBSERVACION" | "DELICADO";

export const ESTADO_PARTE: Record<EstadoParte, { emoji: string; texto: string }> = {
  ESTABLE: { emoji: "🟢", texto: "Estable" },
  OBSERVACION: { emoji: "🟡", texto: "En observación" },
  DELICADO: { emoji: "🔴", texto: "Delicado" },
};

export const COLOR_ESTADO_PARTE: Record<EstadoParte, string> = {
  ESTABLE: "bg-exito-50 text-exito-600",
  OBSERVACION: "bg-alerta-50 text-alerta-600",
  DELICADO: "bg-peligro-50 text-peligro-600",
};

export const ESTADO_INTERNACION: Record<"INTERNADA" | "ALTA" | "DERIVADA" | "FALLECIDA", string> = {
  INTERNADA: "Internada",
  ALTA: "Alta",
  DERIVADA: "Derivada",
  FALLECIDA: "Falleció",
};

export const fechaHoraAR = (f: string | Date) =>
  new Date(f).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

/** Ahora en hora argentina, para precargar un <input type="datetime-local">: "2026-10-02T14:30". */
export function ahoraArgentinaInput(): string {
  const ar = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return ar.toISOString().slice(0, 16);
}

export const TIPOS_ESTUDIO = [
  "Análisis de sangre",
  "Análisis de orina",
  "Coproparasitológico",
  "Radiografía",
  "Ecografía",
  "Electrocardiograma",
  "Citología",
  "Otro",
];
