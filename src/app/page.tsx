import { prisma } from "@/lib/prisma";
import { getFechaHoyArgentina } from "@/lib/disponibilidad";
import ReservaWizard from "@/components/ReservaWizard";
import MarcaBadge from "@/components/MarcaBadge";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [servicios, bloques, configuracion] = await Promise.all([
    prisma.servicio.findMany({ where: { activo: true }, orderBy: { createdAt: "asc" } }),
    prisma.horarioBloque.findMany(),
    prisma.configuracionNegocio.findFirst(),
  ]);

  const negocioNombre = configuracion?.nombre ?? "Mundo Animal";

  return (
    <div className="fondo-reserva">
      <div className="circulo-1" />
      <div className="punto" style={{ top: 60, left: "10%", width: 16, height: 16 }} />
      <div className="punto" style={{ top: 120, right: "12%", width: 10, height: 10 }} />
      <div className="punto" style={{ bottom: 180, left: "8%", width: 14, height: 14 }} />
      <div className="punto" style={{ bottom: 120, right: "16%", width: 9, height: 9 }} />

      <div className="relative mx-auto max-w-md px-4 py-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-3.5 rounded-full p-1"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.5))", boxShadow: "0 14px 28px -10px rgba(0,0,0,0.35)" }}
          >
            <MarcaBadge logoUrl={configuracion?.logoUrl} nombre={negocioNombre} size={74} />
          </div>
          <p className="font-display text-xl font-semibold text-white">{negocioNombre}</p>
          {configuracion?.direccion ? (
            <p className="mt-0.5 text-sm text-white/80">{configuracion.direccion}</p>
          ) : (
            <p className="mt-0.5 text-sm text-white/80">Reservá tu turno</p>
          )}
        </div>

        <div className="rounded-3xl bg-white/95 p-1 shadow-[0_30px_70px_-24px_rgba(51,18,58,0.55)] backdrop-blur-xl">
          <ReservaWizard
            servicios={servicios}
            bloques={bloques}
            fechaHoy={getFechaHoyArgentina()}
            negocioNombre={negocioNombre}
          />
        </div>
        <p className="mt-6 text-center text-xs text-white/75">🐾 Tu mascota merece el mejor cuidado</p>
      </div>
    </div>
  );
}
