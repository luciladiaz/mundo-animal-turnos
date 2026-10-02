import { z } from "zod";

/** "Antibiótico  X" → "antibiotico x": para buscar sin acentos y detectar duplicados. */
export function claveNombreProducto(nombre: string): string {
  return nombre
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const centavos = z.number().int().min(0);

export const datosProductoSchema = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre"),
  categoriaId: z.string().min(1, "Elegí una categoría"),
  precioVenta: centavos,
  costo: centavos.nullable().optional(),
  stockMinimo: z.number().int().min(0).default(0),
  controlaVencimiento: z.boolean().default(false),
});

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

// Stock con el que arranca un producto al darlo de alta (opcional).
export const stockInicialSchema = z.object({
  cantidad: z.number().int().min(1),
  codigoLote: z.string().optional().nullable(),
  vencimiento: fecha.optional().nullable(),
});
