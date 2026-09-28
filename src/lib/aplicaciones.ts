import type { Prisma } from "@prisma/client";
import { claveProducto } from "@/lib/planSanitario";
import type { z } from "zod";
import type { datosAplicacionSchema } from "@/lib/planSanitario";

/**
 * Registra una vacuna/desparasitación. Las aplicaciones anteriores del mismo producto
 * para esa mascota quedan "resueltas": ya se aplicó la dosis que estaban esperando, así
 * que dejan de aparecer en Recordatorios.
 */
export async function registrarAplicacion(
  tx: Prisma.TransactionClient,
  datos: z.infer<typeof datosAplicacionSchema> & { mascotaId: string; consultaId?: string | null; aplicadoPor: string }
) {
  const productoClave = claveProducto(datos.producto);
  await tx.aplicacion.updateMany({
    where: { mascotaId: datos.mascotaId, productoClave, resuelta: false, fecha: { lte: datos.fecha } },
    data: { resuelta: true },
  });
  return tx.aplicacion.create({
    data: {
      ...datos,
      producto: datos.producto.trim().replace(/\s+/g, " "),
      productoClave,
      consultaId: datos.consultaId ?? null,
    },
  });
}
