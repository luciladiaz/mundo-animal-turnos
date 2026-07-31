"use client";

import { useState } from "react";
import type { Servicio, HorarioBloque } from "@prisma/client";
import MarcaBadge from "@/components/MarcaBadge";
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

type Tab = "inicio" | "servicios" | "turnos";

const TABS: { key: Tab; label: string }[] = [
  { key: "inicio", label: "Inicio" },
  { key: "servicios", label: "Servicios" },
  { key: "turnos", label: "Turnos" },
];

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
  const [tab, setTab] = useState<Tab>("inicio");

  return (
    <div className="fondo-reserva">
      <div className="circulo-1" />
      <div className="punto" style={{ top: 60, left: "10%", width: 16, height: 16 }} />
      <div className="punto" style={{ top: 120, right: "12%", width: 10, height: 10 }} />
      <div className="punto" style={{ bottom: 180, left: "8%", width: 14, height: 14 }} />
      <div className="punto" style={{ bottom: 120, right: "16%", width: 9, height: 9 }} />

      <div className="relative mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-3.5 rounded-full p-1"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.5))",
              boxShadow: "0 14px 28px -10px rgba(0,0,0,0.35)",
            }}
          >
            <MarcaBadge logoUrl={logoUrl} nombre={negocioNombre} size={74} />
          </div>
          <p className="font-display text-2xl font-semibold text-white">{negocioNombre}</p>
          <p className="mt-0.5 text-sm text-white/80">Cuidados Perfectos</p>
          <p className="mt-1 text-sm text-white/70">Dra. Guadalupe Rojas</p>
        </div>

        <div className="mb-5 flex justify-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pildora-nav ${
                tab === t.key ? "bg-white text-[var(--color-primario)] shadow-sm" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="rounded-3xl bg-white/95 p-6 shadow-[0_30px_70px_-24px_rgba(51,18,58,0.55)] backdrop-blur-xl">
          {tab === "inicio" && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="font-display text-xl font-semibold text-humo-900">Sobre nosotros</h2>
                <p className="mt-1 text-sm text-humo-600">
                  En {negocioNombre} cuidamos a tu mascota como parte de la familia. Atención veterinaria completa,
                  a cargo de la Dra. Guadalupe Rojas.
                </p>
              </div>

              {direccion && (
                <div>
                  <h3 className="text-sm font-semibold text-humo-800">📍 Dirección</h3>
                  <p className="text-sm text-humo-600">{direccion}</p>
                </div>
              )}

              {telefono && (
                <div>
                  <h3 className="text-sm font-semibold text-humo-800">📞 Teléfono</h3>
                  <p className="text-sm text-humo-600">{telefono}</p>
                </div>
              )}

              {horarioTexto.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-humo-800">🕐 Horarios de atención</h3>
                  <ul className="mt-1 flex flex-col gap-0.5 text-sm text-humo-600">
                    {horarioTexto.map((linea) => (
                      <li key={linea}>{linea}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={() => setTab("turnos")} className="btn-primary mt-2 w-fit rounded-lg px-5 py-2.5 text-sm">
                Reservar un turno →
              </button>
            </div>
          )}

          {tab === "servicios" && (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-xl font-semibold text-humo-900">Qué ofrecemos</h2>
              {servicios.length === 0 ? (
                <p className="text-sm text-humo-500">Todavía no hay servicios cargados.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {servicios.map((s) => (
                    <div
                      key={s.id}
                      className="card-suave flex items-center justify-between rounded-xl border border-humo-100 bg-white p-4"
                    >
                      <div>
                        <p className="font-medium text-humo-900">{s.nombre}</p>
                        {s.descripcion && <p className="text-sm text-humo-500">{s.descripcion}</p>}
                        <p className="text-xs text-humo-400">{s.duracionMinutos} min</p>
                      </div>
                      <p className="font-display text-lg font-semibold tabular-nums text-[var(--color-primario)]">
                        {s.precio != null ? `$${s.precio.toLocaleString("es-AR")}` : "Sin costo"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setTab("turnos")} className="btn-primary mt-2 w-fit rounded-lg px-5 py-2.5 text-sm">
                Reservar un turno →
              </button>
            </div>
          )}

          {tab === "turnos" && (
            <ReservaWizard
              servicios={servicios}
              bloques={bloques}
              diasCerrados={diasCerrados}
              fechaHoy={fechaHoy}
              negocioNombre={negocioNombre}
            />
          )}
        </div>
        <p className="mt-6 text-center text-xs text-white/75">🐾 Tu mascota merece el mejor cuidado</p>
      </div>
    </div>
  );
}
