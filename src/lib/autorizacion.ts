import type { Session } from "next-auth";

/** Solo el rol "admin" puede gestionar usuarios, servicios y configuración del negocio. */
export function esAdmin(session: Session | null): boolean {
  return (session?.user as { role?: string } | undefined)?.role === "admin";
}
