import { z } from "zod";
import type { Session } from "next-auth";

const textoOpcional = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const fechaOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));

export const datosConsultaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  motivo: z.string().trim().min(1, "Falta el motivo de la consulta"),
  anamnesis: textoOpcional,
  pesoKg: z.number().positive("El peso tiene que ser mayor a 0").max(200).optional().nullable(),
  temperatura: z.number().min(30, "Temperatura fuera de rango").max(45, "Temperatura fuera de rango").optional().nullable(),
  frecuenciaCardiaca: z.number().int().min(1).max(400).optional().nullable(),
  frecuenciaRespiratoria: z.number().int().min(1).max(200).optional().nullable(),
  condicionCorporal: z.number().int().min(1).max(9).optional().nullable(),
  mucosas: textoOpcional,
  hidratacion: textoOpcional,
  examen: textoOpcional,
  diagnostico: textoOpcional,
  tratamiento: textoOpcional,
  estudios: textoOpcional,
  proximoControl: fechaOpcional,
});

/** Campos que se guardan en ConsultaCambio como "versión anterior" al editar. */
export const CAMPOS_CONSULTA = [
  "fecha",
  "motivo",
  "anamnesis",
  "pesoKg",
  "temperatura",
  "frecuenciaCardiaca",
  "frecuenciaRespiratoria",
  "condicionCorporal",
  "mucosas",
  "hidratacion",
  "examen",
  "diagnostico",
  "tratamiento",
  "estudios",
  "proximoControl",
] as const;

export function nombreUsuario(session: Session | null): string {
  return session?.user?.name || session?.user?.email || "Usuario";
}
