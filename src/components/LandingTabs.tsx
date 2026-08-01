"use client";

import type { Servicio, HorarioBloque } from "@prisma/client";
import MarcaBadge from "@/components/MarcaBadge";
import IconoServicio from "@/components/IconoServicio";
import ReservaWizard from "@/components/ReservaWizard";

// Prestaciones del centro que todavía no están cargadas como Servicio reservable
// (sin duración/precio propios) — se muestran igual como parte de lo que se ofrece.
const SERVICIOS_ADICIONALES = [
  { nombre: "Laboratorio", descripcion: "Análisis clínicos y estudios diagnósticos." },
  { nombre: "Fisioterapia", descripcion: "Rehabilitación y recuperación para tu mascota." },
  { nombre: "Odontología", descripcion: "Limpieza y cuidado de la salud bucal de tu mascota." },
];

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
      <nav className="fixed inset-x-0 top-0 z-20 flex items-center justify-between bg-[#0a0a0d]/70 px-4 py-3 backdrop-blur-md sm:px-8">
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

      {/* Hero — layout asimétrico a dos columnas (no centrado): texto a la
          izquierda, panel visual a la derecha reservado para una foto real
          de la Dra. Rojas / el consultorio. Hasta que Lucila cargue esa foto,
          el panel lleva una huella como motivo decorativo de marca. */}
      <section id="inicio" className="hero-landing scroll-mt-16 px-4 py-28 sm:px-8 lg:py-36">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="text-center lg:text-left">
            <p className="mb-5 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-celeste-300)] lg:justify-start">
              <span className="h-px w-8 bg-[var(--color-celeste-300)]" />
              Veterinaria de confianza
            </p>

            <h1 className="font-display text-5xl font-semibold leading-[0.98] text-white sm:text-6xl lg:text-7xl">
              {negocioNombre}
            </h1>
            <p className="mt-1 font-display text-5xl font-semibold leading-[0.98] text-[var(--color-celeste-300)] sm:text-6xl lg:text-7xl">
              Cuidados Perfectos
            </p>

            <p className="mx-auto mt-7 max-w-md text-base text-white/55 sm:text-lg lg:mx-0">
              Atención veterinaria completa, cercana y de confianza para tu mascota — con la Dra. Guadalupe Rojas.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
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

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/45 lg:justify-start">
              <span className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Reservá en 1 minuto
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Confirmación al instante
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Sin costo de reserva
              </span>
            </div>
          </div>

          {/* Panel visual — reemplazar el div "panel-foto" por <img src="/foto-guadalupe.jpg" .../>
              con object-cover cuando Lucila suba la foto real. */}
          <div className="relative mx-auto aspect-[4/5] w-full max-w-sm lg:mx-0 lg:ml-auto">
            <div className="panel-foto absolute inset-0 flex items-center justify-center rounded-[2.5rem]">
              <IconoServicio nombre="huella" size={132} stroke="rgba(255,255,255,0.16)" />
            </div>
            <div className="absolute -bottom-6 left-6 right-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#150c1c]/90 px-4 py-3 shadow-xl backdrop-blur-md sm:left-6 sm:right-auto">
              <MarcaBadge logoUrl={logoUrl} nombre={negocioNombre} size={42} />
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Dra. Guadalupe Rojas</p>
                <p className="text-xs text-white/50">Médica veterinaria</p>
              </div>
            </div>
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

          <div className="grid gap-5 sm:grid-cols-2">
            {servicios.map((s) => (
              <div key={s.id} className="tarjeta-servicio flex items-center gap-4 p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mora-50">
                  <IconoServicio nombre={s.nombre} size={24} />
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <p className="font-display text-lg font-semibold text-humo-900">{s.nombre}</p>
                  {s.descripcion && <p className="text-sm text-humo-500">{s.descripcion}</p>}
                </div>
              </div>
            ))}
            {SERVICIOS_ADICIONALES.map((s) => (
              <div key={s.nombre} className="tarjeta-servicio flex items-center gap-4 p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mora-50">
                  <IconoServicio nombre={s.nombre} size={24} />
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <p className="font-display text-lg font-semibold text-humo-900">{s.nombre}</p>
                  <p className="text-sm text-humo-500">{s.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-humo-500">
            Los precios se muestran al elegir el horario, en el paso de reserva.
          </p>
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
