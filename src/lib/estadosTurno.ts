// Colores semánticos de estado — independientes del acento de marca, así el estado
// de un turno se lee igual sin importar qué colores tenga cada cliente de Solvit Studio.
export const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: "bg-alerta-50 text-alerta-600",
  CONFIRMADO: "bg-exito-50 text-exito-600",
  CANCELADO: "bg-humo-100 text-humo-400 line-through",
  COMPLETADO: "bg-celeste-50 text-celeste-600",
  NO_ASISTIO: "bg-peligro-50 text-peligro-600",
};

export const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
  COMPLETADO: "Asistió",
  NO_ASISTIO: "No asistió",
};
