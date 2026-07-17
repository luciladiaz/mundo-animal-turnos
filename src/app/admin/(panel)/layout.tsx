import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { esAdmin, tienePermiso } from "@/lib/autorizacion";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import LogoutButton from "@/components/LogoutButton";
import MarcaBadge from "@/components/MarcaBadge";
import NavLinks from "@/components/NavLinks";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const [session, configuracion] = await Promise.all([auth(), prisma.configuracionNegocio.findFirst()]);

  const nav = [{ href: "/admin", label: "Dashboard" }];
  if (tienePermiso(session, "turnos")) nav.push({ href: "/admin/turnos", label: "Turnos" });
  if (tienePermiso(session, "servicios")) nav.push({ href: "/admin/servicios", label: "Servicios" });
  if (esAdmin(session)) nav.push({ href: "/admin/usuarios", label: "Usuarios" });
  if (tienePermiso(session, "configuracion")) nav.push({ href: "/admin/configuracion", label: "Configuración" });

  const nombreCompleto = (session?.user as { name?: string } | undefined)?.name ?? session?.user?.email ?? "";
  const primerNombre = nombreCompleto.split(" ")[0];
  const negocioNombre = configuracion?.nombre ?? "Panel";

  return (
    <SessionProviderWrapper>
      <div className="flex min-h-full flex-col">
        <header className="banner-admin px-4 py-4 sm:px-6">
          <div className="aro" />
          <div className="punto" style={{ top: 12, left: "10%", width: 8, height: 8 }} />
          <div className="punto" style={{ bottom: 10, right: "12%", width: 10, height: 10 }} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="rounded-full p-[3px]"
                style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.5))" }}
              >
                <MarcaBadge logoUrl={configuracion?.logoUrl} nombre={negocioNombre} size={38} />
              </div>
              <div>
                <p className="font-display font-semibold text-white">{negocioNombre}</p>
                <p className="text-xs text-white/75">Panel administrador</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/90">
              <span>Hola, {primerNombre} 👋</span>
              <LogoutButton />
            </div>
          </div>
          <nav className="relative mt-4 flex gap-2 overflow-x-auto">
            <NavLinks items={nav} />
          </nav>
        </header>
        <main className="flex-1 bg-[#f6f2f9] p-4 sm:p-6">{children}</main>
      </div>
    </SessionProviderWrapper>
  );
}
