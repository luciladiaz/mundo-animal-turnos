import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { ErrorNegocio } from "@/lib/errorNegocio";

const textoOpcional = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

/** "2026-10-02T14:30" escrito en hora argentina (UTC-3 fija) → Date. */
export function fechaHoraArgentina(valor: string): Date {
  return new Date(`${valor}:00-03:00`);
}

export const internarSchema = z.object({
  mascotaId: z.string().min(1),
  ingresoEn: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Fecha de ingreso inválida").optional().nullable(),
  motivo: z.string().trim().min(1, "Falta el motivo de la internación"),
  diagnostico: textoOpcional,
  veterinario: z.string().trim().min(1, "Falta quién está a cargo"),
});

export const parteSchema = z.object({
  estado: z.enum(["ESTABLE", "OBSERVACION", "DELICADO"]),
  parteFamilia: z.string().trim().min(1, "Escribí el parte para la familia"),
  notaClinica: textoOpcional,
});

export const medicacionSchema = z.object({
  medicamento: z.string().trim().min(1, "Falta el medicamento"),
  dosis: z.string().trim().min(1, "Falta la dosis"),
  via: textoOpcional,
  frecuenciaHoras: z.number().int().min(1).max(72).nullable(),
  indicaciones: textoOpcional,
});

export const egresoSchema = z.object({
  tipo: z.enum(["ALTA", "DERIVADA", "FALLECIDA"]),
  indicacionesAlta: textoOpcional,
  notaEgreso: textoOpcional,
});

export async function internar(
  db: PrismaClient,
  datos: Omit<z.infer<typeof internarSchema>, "diagnostico"> & { diagnostico?: string | null },
  usuario: string
) {
  const mascota = await db.mascota.findUnique({ where: { id: datos.mascotaId }, select: { id: true, fallecida: true } });
  if (!mascota) throw new ErrorNegocio("Mascota no encontrada", 404);
  if (mascota.fallecida) throw new ErrorNegocio("La mascota figura como fallecida");
  const activa = await db.internacion.findFirst({ where: { mascotaId: mascota.id, estado: "INTERNADA" }, select: { id: true } });
  if (activa) throw new ErrorNegocio("Esta mascota ya está internada", 409);
  // El índice único "Internacion_una_activa_por_mascota" frena una doble carga simultánea.
  return db.internacion.create({
    data: {
      mascotaId: mascota.id,
      ingresoEn: datos.ingresoEn ? fechaHoraArgentina(datos.ingresoEn) : new Date(),
      motivo: datos.motivo,
      diagnostico: datos.diagnostico ?? null,
      veterinario: datos.veterinario,
      creadaPor: usuario,
    },
  });
}

async function internacionActiva(db: PrismaClient, id: string) {
  const internacion = await db.internacion.findUnique({ where: { id }, select: { id: true, estado: true, mascotaId: true } });
  if (!internacion) throw new ErrorNegocio("Internación no encontrada", 404);
  if (internacion.estado !== "INTERNADA") throw new ErrorNegocio("Esta internación ya terminó", 409);
  return internacion;
}

export async function agregarParte(db: PrismaClient, internacionId: string, datos: z.infer<typeof parteSchema>, usuario: string) {
  await internacionActiva(db, internacionId);
  return db.parteInternacion.create({ data: { internacionId, ...datos, autor: usuario } });
}

export async function agregarMedicacion(
  db: PrismaClient,
  internacionId: string,
  datos: z.infer<typeof medicacionSchema>,
  usuario: string
) {
  await internacionActiva(db, internacionId);
  return db.medicacionInternacion.create({ data: { internacionId, ...datos, creadaPor: usuario } });
}

export async function registrarToma(db: PrismaClient, medicacionId: string, observaciones: string | null, usuario: string) {
  const med = await db.medicacionInternacion.findUnique({
    where: { id: medicacionId },
    include: { internacion: { select: { estado: true } } },
  });
  if (!med) throw new ErrorNegocio("Medicación no encontrada", 404);
  if (!med.activa) throw new ErrorNegocio("Esta medicación está suspendida");
  if (med.internacion.estado !== "INTERNADA") throw new ErrorNegocio("Esta internación ya terminó", 409);
  return db.tomaMedicacion.create({
    data: { medicacionId, administradaPor: usuario, observaciones: observaciones?.trim() || null },
  });
}

export async function suspenderMedicacion(db: PrismaClient, medicacionId: string, usuario: string) {
  const med = await db.medicacionInternacion.findUnique({ where: { id: medicacionId } });
  if (!med) throw new ErrorNegocio("Medicación no encontrada", 404);
  if (!med.activa) return med;
  return db.medicacionInternacion.update({
    where: { id: medicacionId },
    data: { activa: false, suspendidaEn: new Date(), suspendidaPor: usuario },
  });
}

/**
 * Egreso: alta, derivación o fallecimiento. Suspende las medicaciones activas y, si
 * falleció, marca la ficha de la mascota como fallecida (deja de recibir recordatorios).
 */
export async function darEgreso(db: PrismaClient, internacionId: string, datos: z.infer<typeof egresoSchema>, usuario: string) {
  const internacion = await internacionActiva(db, internacionId);
  if (datos.tipo === "ALTA" && !datos.indicacionesAlta) {
    throw new ErrorNegocio("Escribí las indicaciones para la casa");
  }
  const ahora = new Date();
  return db.$transaction(async (tx) => {
    await tx.medicacionInternacion.updateMany({
      where: { internacionId, activa: true },
      data: { activa: false, suspendidaEn: ahora, suspendidaPor: usuario },
    });
    if (datos.tipo === "FALLECIDA") {
      await tx.mascota.update({ where: { id: internacion.mascotaId }, data: { fallecida: true } });
    }
    return tx.internacion.update({
      where: { id: internacionId },
      data: {
        estado: datos.tipo,
        egresoEn: ahora,
        egresoPor: usuario,
        indicacionesAlta: datos.indicacionesAlta,
        notaEgreso: datos.notaEgreso,
      },
    });
  });
}

/**
 * Próxima toma estimada: última toma + frecuencia (o, si nunca se dio, desde que se
 * indicó: "ya corresponde"). null si es "según necesidad" o está suspendida.
 */
export function proximaToma(
  med: { activa: boolean; frecuenciaHoras: number | null; createdAt: Date | string },
  ultimaToma: Date | string | null
): Date | null {
  if (!med.activa || !med.frecuenciaHoras) return null;
  if (!ultimaToma) return new Date(med.createdAt);
  return new Date(new Date(ultimaToma).getTime() + med.frecuenciaHoras * 60 * 60 * 1000);
}

/** Corrección de un parte (solo admin). Queda registrado quién y cuándo lo corrigió. */
export async function editarParte(db: PrismaClient, parteId: string, datos: z.infer<typeof parteSchema>, usuario: string) {
  const parte = await db.parteInternacion.findUnique({ where: { id: parteId }, select: { id: true } });
  if (!parte) throw new ErrorNegocio("Parte no encontrado", 404);
  return db.parteInternacion.update({
    where: { id: parteId },
    data: { ...datos, editadoEn: new Date(), editadoPor: usuario },
  });
}

export const estudioSchema = z.object({
  tipo: z.string().trim().min(1, "Elegí el tipo de estudio"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Fecha inválida").optional().nullable(),
  resultado: textoOpcional,
});

/** Estudio hecho durante la internación. Se puede cargar también después del alta (los resultados suelen llegar más tarde). */
export async function crearEstudio(db: PrismaClient, internacionId: string, datos: z.infer<typeof estudioSchema>, usuario: string) {
  const internacion = await db.internacion.findUnique({ where: { id: internacionId }, select: { id: true } });
  if (!internacion) throw new ErrorNegocio("Internación no encontrada", 404);
  return db.estudioInternacion.create({
    data: {
      internacionId,
      tipo: datos.tipo,
      fecha: datos.fecha ? fechaHoraArgentina(datos.fecha) : new Date(),
      resultado: datos.resultado,
      autor: usuario,
    },
  });
}
