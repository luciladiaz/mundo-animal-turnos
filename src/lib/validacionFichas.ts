import { z } from "zod";

// Texto opcional que llega del formulario: "" se guarda como null.
const textoOpcional = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const datosTutorSchema = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre"),
  telefono: z.string().trim().min(1, "Falta el teléfono"),
  email: textoOpcional,
  dni: textoOpcional,
  direccion: textoOpcional,
  notas: textoOpcional,
  aceptaRecordatorios: z.boolean().optional(),
});

export const datosMascotaSchema = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre de la mascota"),
  especie: textoOpcional,
  raza: textoOpcional,
  sexo: z.enum(["Macho", "Hembra"]).optional().nullable(),
  castrado: z.boolean().optional().nullable(),
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de nacimiento inválida")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  color: textoOpcional,
  microchip: textoOpcional,
  pesoKg: z.number().positive("El peso tiene que ser mayor a 0").max(200).optional().nullable(),
  alertas: textoOpcional,
  notas: textoOpcional,
  fallecida: z.boolean().optional(),
});
