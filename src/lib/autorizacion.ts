import type { Session } from "next-auth";

export type Pestaña = "turnos" | "servicios" | "configuracion";

type SessionUser = { esAdmin?: boolean; permisos?: string[] } | undefined;

/** Solo esAdmin puede gestionar usuarios — no es configurable por pestaña, es un límite de seguridad fijo. */
export function esAdmin(session: Session | null): boolean {
  return (session?.user as SessionUser)?.esAdmin === true;
}

/**
 * Acceso a una pestaña puntual (Turnos/Servicios/Configuración): esAdmin siempre tiene
 * acceso a todo; el resto depende de los permisos elegidos para ese usuario.
 * Dashboard no pasa por acá — queda siempre visible para cualquier usuario activo.
 */
export function tienePermiso(session: Session | null, pestaña: Pestaña): boolean {
  const user = session?.user as SessionUser;
  if (user?.esAdmin) return true;
  return user?.permisos?.includes(pestaña) ?? false;
}
