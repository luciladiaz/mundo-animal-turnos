import type { Prisma } from "@prisma/client";

// Mismos criterios que la migración 20260928120000_fichas_tutor_mascota — si se cambia
// uno, hay que cambiar el otro, o los turnos nuevos no van a caer en las fichas viejas.

/** Últimos 10 dígitos del teléfono: "+54 9 299 412-3456" y "2994123456" → "2994123456". */
export function claveTelefono(telefono: string): string {
  return telefono.replace(/\D/g, "").slice(-10);
}

export function limpiarNombre(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, " ");
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

export function claveNombreMascota(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").toLowerCase();
}

const RAZAS_DE_PERRO = ["border collie", "caniche", "mestiza", "mestizo"];

/** Unifica lo que se escribe a mano ("canino", "Felina", "Gatito"...) en "Perro" / "Gato". */
export function normalizarEspecie(especie: string | null | undefined): { especie: string | null; raza: string | null } {
  const original = especie?.trim() ?? "";
  const valor = original.toLowerCase();
  if (!valor) return { especie: null, raza: null };
  if (["canino", "canina", "perro", "perra", "perrito", "perrita"].includes(valor)) return { especie: "Perro", raza: null };
  if (["felino", "felina", "feline", "gato", "gata", "gatito", "gatita"].includes(valor)) return { especie: "Gato", raza: null };
  if (RAZAS_DE_PERRO.includes(valor)) return { especie: "Perro", raza: original };
  return { especie: original, raza: null };
}

/**
 * Busca (o crea) la ficha del tutor por teléfono y la de la mascota por nombre, para
 * vincular un turno nuevo. Corre dentro de la transacción de la reserva. Una ficha que
 * ya existe no se pisa: solo se completan datos que estaban vacíos.
 */
export async function vincularFichas(
  tx: Prisma.TransactionClient,
  datos: { clienteNombre: string; clienteTelefono: string; mascotaNombre?: string; mascotaEspecie?: string }
): Promise<{ tutorId: string | null; mascotaId: string | null }> {
  const telefonoClave = claveTelefono(datos.clienteTelefono);
  if (!telefonoClave) return { tutorId: null, mascotaId: null };

  const tutor = await tx.tutor.upsert({
    where: { telefonoClave },
    update: {},
    create: {
      nombre: datos.clienteNombre.trim(),
      telefono: datos.clienteTelefono.trim(),
      telefonoClave,
    },
  });

  const nombreClave = datos.mascotaNombre ? claveNombreMascota(datos.mascotaNombre) : "";
  if (!nombreClave) return { tutorId: tutor.id, mascotaId: null };

  const { especie, raza } = normalizarEspecie(datos.mascotaEspecie);
  const existente = await tx.mascota.findFirst({ where: { tutorId: tutor.id, nombreClave } });
  if (existente) {
    if (!existente.especie && especie) {
      await tx.mascota.update({
        where: { id: existente.id },
        data: { especie, ...(raza && !existente.raza ? { raza } : {}) },
      });
    }
    return { tutorId: tutor.id, mascotaId: existente.id };
  }

  const mascota = await tx.mascota.create({
    data: { tutorId: tutor.id, nombre: limpiarNombre(datos.mascotaNombre!), nombreClave, especie, raza },
  });
  return { tutorId: tutor.id, mascotaId: mascota.id };
}
