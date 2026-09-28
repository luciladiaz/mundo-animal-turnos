import { z } from "zod";

export type TipoAplicacion = "VACUNA" | "DESPARASITACION_INTERNA" | "DESPARASITACION_EXTERNA";

export const TIPO_LABEL: Record<TipoAplicacion, string> = {
  VACUNA: "Vacuna",
  DESPARASITACION_INTERNA: "Desparasitación interna",
  DESPARASITACION_EXTERNA: "Desparasitación externa (pulgas y garrapatas)",
};

/**
 * Productos sugeridos y cada cuántos días se repiten (práctica habitual en Argentina:
 * refuerzos anuales; antirrábica anual por Ley 22.953). Son valores por defecto: la
 * próxima fecha siempre se puede cambiar en el formulario.
 */
export const PRODUCTOS: Record<TipoAplicacion, { nombre: string; dias: number }[]> = {
  VACUNA: [
    { nombre: "Antirrábica", dias: 365 },
    { nombre: "Séxtuple", dias: 365 },
    { nombre: "Quíntuple", dias: 365 },
    { nombre: "Óctuple", dias: 365 },
    { nombre: "Triple felina", dias: 365 },
    { nombre: "Leucemia felina", dias: 365 },
    { nombre: "Tos de las perreras", dias: 365 },
  ],
  DESPARASITACION_INTERNA: [{ nombre: "Antiparasitario interno", dias: 90 }],
  DESPARASITACION_EXTERNA: [
    { nombre: "Pipeta", dias: 30 },
    { nombre: "Comprimido mensual (NexGard, Simparica)", dias: 30 },
    { nombre: "Bravecto", dias: 84 },
    { nombre: "Collar Seresto", dias: 240 },
  ],
};

/** Atajos para la próxima fecha (cachorros: dosis cada 21 días; desparasitación de cachorro cada 15 o 30). */
export const ATAJOS_PROXIMA: { texto: string; dias: number }[] = [
  { texto: "15 días", dias: 15 },
  { texto: "21 días", dias: 21 },
  { texto: "1 mes", dias: 30 },
  { texto: "3 meses", dias: 90 },
  { texto: "1 año", dias: 365 },
];

export function diasSugeridos(tipo: TipoAplicacion, producto: string): number | null {
  const clave = claveProducto(producto);
  return PRODUCTOS[tipo].find((p) => claveProducto(p.nombre) === clave)?.dias ?? null;
}

export function claveProducto(producto: string): string {
  return producto.trim().replace(/\s+/g, " ").toLowerCase();
}

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const datosAplicacionSchema = z.object({
  tipo: z.enum(["VACUNA", "DESPARASITACION_INTERNA", "DESPARASITACION_EXTERNA"]),
  producto: z.string().trim().min(1, "Falta el nombre de la vacuna o el producto"),
  lote: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  fecha,
  proximaFecha: fecha.optional().nullable().or(z.literal("").transform(() => null)),
  notas: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});
