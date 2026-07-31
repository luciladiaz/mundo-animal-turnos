"use client";

import type { Servicio, HorarioBloque } from "@prisma/client";
import MarcaBadge from "@/components/MarcaBadge";
import IconoServicio from "@/components/IconoServicio";
import ReservaWizard from "@/components/ReservaWizard";

interface Props {
  negocioNombre: string;
  logoUrl: string | null;
  direccion: string | null;
  telefono: string | null;
  horarioTexto: string[];
  servicios: Servicio[];
  bloques: HorarioBloque[];
  diasCerrados: string[];
  fechaHoy: string;
}

export default function LandingTabs({
  negocioNombre,
  logoUrl,
  direccion,
  telefono,
  horarioTexto,
  servicios,
  bloques,
  diasCerrados,
  fechaHoy,
}: Props) {
  return (
    <div className="bg-humo-50">
      {/* Nav flotante */}
      <nav className="fixed inset-x-0 top-0 z-20 flex items-center justify-between bg-[#0d0a10]/70 px-4 py-3 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-2">
          <MarcaBadge logoUrl={logoUrl} nombre={negocioNombre} size={30} />
          <span className="font-display text-sm font-semibold text-white">{negocioNombre}</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <a href="#servicios" className="hidden text-sm font-medium text-white/80 transition hover:text-white sm:block">
            Servicios
          </a>
          <a href="#nosotros" className="hidden text-sm font-medium text-white/80 transition hover:text-white sm:block">
            Nosotros
          </a>
          <a href="#turnos" className="btn-primary rounded-full px-4 py-2 text-xs sm:text-sm">
            Reservar turno
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section id="inicio" className="hero-landing flex min-h-screen scroll-mt-16 flex-col items-center justify-center px-4 py-32 text-center">
        <div className="glow-orb" style={{ top: "-10%", left: "-10%", width: 480, height: 480, background: "var(--color-primario)" }} />
        <div className="glow-orb" style={{ bottom: "-15%", right: "-10%", width: 420, height: 420, background: "var(--color-secundario)" }} />

        <div className="relative flex flex-col items-center">
          <div
            className="mb-6 rounded-full p-1.5"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.05))", boxShadow: "0 0 60px -10px color-mix(in srgb, var(--color-primario) 70%, transparent)" }}
          >
            <MarcaBadge logoUrl={logoUrl} nombre={negocioNombre} size={92} />
          </div>

          <span className="mb-4 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-white/70">
            Dra. Guadalupe Rojas
          </span>

          <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[1.05] text-white sm:text-7xl">
            {negocioNombre}
          </h1>
          <p className="mt-5 max-w-md text-lg text-white/70 sm:text-xl">Cuidados Perfectos</p>
          <p className="mt-2 max-w-md text-sm text-white/50">
            Atención veterinaria completa, cercana y de confianza para tu mascota.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href="#turnos" className="btn-primary rounded-full px-7 py-3.5 text-base">
              Reservar un turno →
            </a>
            <a
              href="#servicios"
              className="rounded-full border border-white/20 px-7 py-3.5 text-base font-medium text-white transition hover:bg-white/10"
            >
              Ver servicios
            </a>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="scroll-mt-16 px-4 py-24 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-secundario)]">
            Qué ofrecemos
          </p>
          <h2 className="mb-12 text-center font-display text-4xl font-semibold text-humo-900 sm:text-5xl">
            Cuidado para cada etapa
          </h2>

          {servicios.length === 0 ? (
            <p className="text-center text-sm text-humo-500">Todavía no hay servicios cargados.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {servicios.map((s) => (
                <div key={s.id} className="tarjeta-servicio flex items-start gap-4 p-6">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mora-50">
                    <IconoServicio nombre={s.nombre} size={24} />
                  </span>
                  <div className="flex flex-1 flex-col gap-1">
                    <p className="font-display text-lg font-semibold text-humo-900">{s.nombre}</p>
                    {s.descripcion && <p className="text-sm text-humo-500">{s.descripcion}</p>}
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide text-humo-400">{s.duracionMinutos} min</span>
                      <span className="font-display text-xl font-semibold tabular-nums text-[var(--color-primario)]">
                        {s.precio != null ? `$${s.precio.toLocaleString("es-AR")}` : "Sin costo"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Nosotros */}
      <section id="nosotros" className="seccion-oscura scroll-mt-16 px-4 py-24 text-white sm:px-8">
        <div className="mx-auto grid max-w-4xl gap-12 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-secundario)]">
              Sobre nosotros
            </p>
            <h2 className="mb-4 font-display text-3xl font-semibold sm:text-4xl">
              Tu mascota, en las mejores manos
            </h2>
            <p className="text-white/70">
              En {negocioNombre} atendemos a tu mascota como parte de la familia. La Dra. Guadalupe Rojas lleva
              adelante cada consulta con cercanía, calidez y atención personalizada — sin vueltas, sin esperas
              eternas, con la info clara de cada tratamiento.
            </p>
          </div>

          <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            {direccion && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Dirección</p>
                <p className="mt-0.5 text-white/90">{direccion}</p>
              </div>
            )}
            {telefono && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Teléfono</p>
                <p className="mt-0.5 text-white/90">{telefono}</p>
              </div>
            )}
            {horarioTexto.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Horarios</p>
                <ul className="mt-0.5 flex flex-col gap-0.5 text-white/90">
                  {horarioTexto.map((linea) => (
                    <li key={linea}>{linea}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Turnos */}
      <section id="turnos" className="scroll-mt-16 px-4 py-24 sm:px-8">
        <div className="mx-auto max-w-md">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-secundario)]">
            Reservá online
          </p>
          <h2 className="mb-8 text-center font-display text-4xl font-semibold text-humo-900">Tu turno en 1 minuto</h2>
          <div className="card-suave rounded-3xl border border-humo-100 bg-white p-2">
            <ReservaWizard
              servicios={servicios}
              bloques={bloques}
              diasCerrados={diasCerrados}
              fechaHoy={fechaHoy}
              negocioNombre={negocioNombre}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="hero-landing px-4 py-10 text-center">
        <p className="font-display text-lg font-semibold text-white">{negocioNombre}</p>
        <p className="mt-1 text-sm text-white/50">🐾 Tu mascota merece el mejor cuidado</p>
      </footer>
    </div>
  );
}
