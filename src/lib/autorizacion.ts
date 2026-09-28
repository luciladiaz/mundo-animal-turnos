import type { Session } from "next-auth";

export type Pestaña = "turnos" | "clientes" | "historia" | "recordatorios" | "servicios" | "configuracion";

type SessionUser = { esAdmin?: boolean; permisos?: string[] } | undefined;

/** Solo esAdmin puede gestionar usuarios — no es configurable por pestaña, es un límite de seguridad fijo. */
export function esAdmin(session: Session | null): boolean {
  return (session?.user as SessionUser)?.esAdmin === true;
}

/**
 * Acceso a una pestaña puntual (Turnos/Clientes/Servicios/Configuración): esAdmin siempre tiene
 * acceso a todo; el resto depende de los permisos elegidos para ese usuario.
 * Dashboard no pasa por acá — queda siempre visible para cualquier usuario activo.
 */
export function tienePermiso(session: Session | null, pestaña: Pestaña): boolean {
  const user = session?.user as SessionUser;
  if (user?.esAdmin) return true;
  return user?.permisos?.includes(pestaña) ?? false;
}

/**
 * Fichas de clientes y mascotas: las ve quien tenga "clientes" (ej. secretaria) o
 * "historia" (veterinario, que necesita llegar a la mascota para cargar la consulta).
 * La historia clínica en sí se controla aparte con tienePermiso(session, "historia").
 */
export function puedeVerFichas(session: Session | null): boolean {
  return tienePermiso(session, "clientes") || tienePermiso(session, "historia");
}
