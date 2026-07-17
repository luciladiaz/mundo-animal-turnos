"use client";

import { useMemo, useState } from "react";
import type { Servicio, HorarioBloque } from "@prisma/client";
import { getDiaSemana, sumarDias } from "@/lib/disponibilidad";

interface Props {
  servicios: Servicio[];
  bloques: HorarioBloque[];
  diasCerrados: string[];
  fechaHoy: string;
  negocioNombre: string;
}

interface FormCliente {
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  mascotaNombre: string;
  mascotaEspecie: string;
  notas: string;
}

const DIAS_A_MOSTRAR = 30;
const NOMBRES_DIA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const NOMBRES_MES = [
  "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic",
];

function formatearFechaCorta(fecha: string): string {
  const [, m, d] = fecha.split("-").map(Number);
  return `${d} ${NOMBRES_MES[m - 1]}`;
}

// Ícono de línea por servicio — se infiere del nombre para no depender de un
// campo nuevo en la base; si no coincide con nada conocido, cae a la huella.
function IconoServicio({ nombre }: { nombre: string }) {
  const n = nombre.toLowerCase();
  const stroke = "var(--color-primario)";
  if (n.includes("baño") || n.includes("peluq") || n.includes("estétic")) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h16a1 1 0 0 1 1 1v1a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-1a1 1 0 0 1 1-1z" />
        <path d="M7 12V7a2 2 0 0 1 2-2h1" />
        <circle cx="7.5" cy="6.5" r="1.1" fill={stroke} stroke="none" />
        <path d="M3 21h18" />
      </svg>
    );
  }
  if (n.includes("vet") || n.includes("consulta") || n.includes("vacun")) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3v5a3 3 0 0 0 6 0V3" />
        <path d="M13 3v5a3 3 0 0 0 3 3v2a5 5 0 0 1-10 0" />
        <circle cx="18" cy="16" r="2.4" />
        <path d="M16.5 15v-1a1.5 1.5 0 0 1 3 0v1" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={stroke} stroke="none">
      <ellipse cx="12" cy="15.5" rx="5" ry="4.2" />
      <ellipse cx="4.8" cy="10.2" rx="2.1" ry="2.6" transform="rotate(-18 4.8 10.2)" />
      <ellipse cx="9.3" cy="5.6" rx="2.1" ry="2.7" transform="rotate(-8 9.3 5.6)" />
      <ellipse cx="14.9" cy="5.6" rx="2.1" ry="2.7" transform="rotate(8 14.9 5.6)" />
      <ellipse cx="19.2" cy="10.2" rx="2.1" ry="2.6" transform="rotate(18 19.2 10.2)" />
    </svg>
  );
}

export default function ReservaWizard({ servicios, bloques, diasCerrados, fechaHoy, negocioNombre }: Props) {
  const [paso, setPaso] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormCliente>({
    clienteNombre: "",
    clienteTelefono: "",
    clienteEmail: "",
    mascotaNombre: "",
    mascotaEspecie: "",
    notas: "",
  });

  const diasDisponibles = useMemo(() => {
    const diasConBloque = new Set(bloques.map((b) => b.diaSemana));
    const fechasCerradas = new Set(diasCerrados);
    const dias: { fecha: string; diaSemana: number; habilitado: boolean }[] = [];
    for (let i = 0; i < DIAS_A_MOSTRAR; i++) {
      const fecha = sumarDias(fechaHoy, i);
      const diaSemana = getDiaSemana(fecha);
      dias.push({ fecha, diaSemana, habilitado: diasConBloque.has(diaSemana) && !fechasCerradas.has(fecha) });
    }
    return dias;
  }, [bloques, diasCerrados, fechaHoy]);

  async function elegirServicio(servicio: Servicio) {
    setServicioSeleccionado(servicio);
    setPaso(2);
  }

  async function elegirFecha(fecha: string) {
    if (!servicioSeleccionado) return;
    setFechaSeleccionada(fecha);
    setCargandoSlots(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/disponibilidad?servicioId=${servicioSeleccionado.id}&fecha=${fecha}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar la disponibilidad");
      setSlots(data.slots ?? []);
      setPaso(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargandoSlots(false);
    }
  }

  function elegirHora(hora: string) {
    setHoraSeleccionada(hora);
    setPaso(4);
  }

  async function confirmarReserva(e: React.FormEvent) {
    e.preventDefault();
    if (!servicioSeleccionado || !fechaSeleccionada || !horaSeleccionada) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicioId: servicioSeleccionado.id,
          fecha: fechaSeleccionada,
          horaInicio: horaSeleccionada,
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Se lo ganaron de mano: volvemos al paso de horarios y refrescamos.
          setError(data.error);
          await elegirFecha(fechaSeleccionada);
          setPaso(3);
          return;
        }
        throw new Error(data.error ?? "No se pudo confirmar el turno");
      }
      setPaso(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-5 py-6">
      {paso < 5 && (
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-1.5 flex-1 overflow-hidden rounded-full bg-humo-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--color-primario)] to-[var(--color-secundario)] transition-all"
                style={{ width: n <= paso ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-peligro-50 px-4 py-3 text-sm text-peligro-600">{error}</div>
      )}

      {paso === 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold text-humo-900">Elegí el servicio</h2>
          {servicios.length === 0 && (
            <p className="text-sm text-humo-500">Todavía no hay servicios cargados.</p>
          )}
          {servicios.map((s) => (
            <button
              key={s.id}
              onClick={() => elegirServicio(s)}
              className="card-suave flex items-center gap-3 rounded-2xl border-2 border-humo-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--color-primario)] hover:shadow-md"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-mora-50">
                <IconoServicio nombre={s.nombre} />
              </span>
              <span className="flex flex-1 flex-col items-start gap-0.5">
                <span className="font-medium text-humo-900">{s.nombre}</span>
                {s.descripcion && <span className="text-sm text-humo-500">{s.descripcion}</span>}
                <span className="text-sm tabular-nums text-[var(--color-secundario)]">
                  {s.duracionMinutos} min{s.precio ? ` · $${s.precio.toLocaleString("es-AR")}` : ""}
                </span>
              </span>
            </button>
          ))}
        </section>
      )}

      {paso === 2 && (
        <section className="flex flex-col gap-3">
          <button onClick={() => setPaso(1)} className="btn-ghost w-fit text-sm font-medium">
            ← Volver
          </button>
          <h2 className="font-display text-xl font-semibold text-humo-900">Elegí el día</h2>
          <div className="grid grid-cols-4 gap-2">
            {diasDisponibles.map(({ fecha, diaSemana, habilitado }) => (
              <button
                key={fecha}
                disabled={!habilitado || cargandoSlots}
                onClick={() => elegirFecha(fecha)}
                className={`flex flex-col items-center rounded-xl border p-2 text-sm transition ${
                  habilitado
                    ? "border-humo-200 bg-white hover:border-[var(--color-primario)] hover:shadow-sm"
                    : "cursor-not-allowed border-humo-100 bg-humo-50 text-humo-300"
                }`}
              >
                <span className="text-[11px] uppercase text-humo-400">{NOMBRES_DIA[diaSemana]}</span>
                <span className="font-medium tabular-nums">{formatearFechaCorta(fecha)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {paso === 3 && (
        <section className="flex flex-col gap-3">
          <button onClick={() => setPaso(2)} className="btn-ghost w-fit text-sm font-medium">
            ← Volver
          </button>
          <h2 className="font-display text-xl font-semibold text-humo-900">Elegí el horario</h2>
          {cargandoSlots && <p className="text-sm text-humo-500">Cargando horarios...</p>}
          {!cargandoSlots && slots.length === 0 && (
            <p className="text-sm text-humo-500">No hay horarios disponibles ese día. Probá otra fecha.</p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {slots.map((hora) => (
              <button
                key={hora}
                onClick={() => elegirHora(hora)}
                className="rounded-xl border border-humo-200 bg-white p-2 text-sm font-medium tabular-nums transition hover:border-[var(--color-primario)] hover:bg-mora-50"
              >
                {hora}
              </button>
            ))}
          </div>
        </section>
      )}

      {paso === 4 && (
        <form onSubmit={confirmarReserva} className="flex flex-col gap-3">
          <button type="button" onClick={() => setPaso(3)} className="btn-ghost w-fit text-sm font-medium">
            ← Volver
          </button>
          <h2 className="font-display text-xl font-semibold text-humo-900">Tus datos</h2>
          <div className="rounded-xl bg-mora-50 px-4 py-3 text-sm text-humo-700">
            {servicioSeleccionado?.nombre} · {fechaSeleccionada && formatearFechaCorta(fechaSeleccionada)} ·{" "}
            <span className="tabular-nums">{horaSeleccionada}</span> hs
          </div>

          <Campo
            label="Tu nombre"
            value={form.clienteNombre}
            onChange={(v) => setForm({ ...form, clienteNombre: v })}
            required
          />
          <Campo
            label="Teléfono"
            value={form.clienteTelefono}
            onChange={(v) => setForm({ ...form, clienteTelefono: v })}
            required
          />
          <Campo
            label="Email (opcional, para recordatorio)"
            type="email"
            value={form.clienteEmail}
            onChange={(v) => setForm({ ...form, clienteEmail: v })}
          />
          <Campo
            label="Nombre de tu mascota"
            value={form.mascotaNombre}
            onChange={(v) => setForm({ ...form, mascotaNombre: v })}
            required
          />
          <Campo
            label="Especie / raza (opcional)"
            value={form.mascotaEspecie}
            onChange={(v) => setForm({ ...form, mascotaEspecie: v })}
          />
          <Campo
            label="Notas (opcional)"
            value={form.notas}
            onChange={(v) => setForm({ ...form, notas: v })}
            textarea
          />

          <button
            type="submit"
            disabled={enviando}
            className="btn-primary mt-2 rounded-xl px-4 py-3 font-semibold"
          >
            {enviando ? "Confirmando..." : "Confirmar turno"}
          </button>
        </form>
      )}

      {paso === 5 && (
        <section className="flex flex-col items-center gap-3 py-10 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white shadow-md"
            style={{ background: "linear-gradient(135deg, var(--color-primario), var(--color-secundario))" }}
          >
            ✓
          </div>
          <h2 className="font-display text-xl font-semibold text-humo-900">¡Turno confirmado!</h2>
          <p className="text-sm text-humo-600">
            {servicioSeleccionado?.nombre} para {form.mascotaNombre} el{" "}
            {fechaSeleccionada && formatearFechaCorta(fechaSeleccionada)} a las{" "}
            <span className="tabular-nums">{horaSeleccionada}</span> hs.
          </p>
          {form.clienteEmail && (
            <p className="text-xs text-humo-400">
              Te enviamos un email de confirmación a {form.clienteEmail}.
            </p>
          )}
          <p className="font-display text-xs text-humo-400">{negocioNombre}</p>
        </section>
      )}
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-humo-600">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
          rows={2}
        />
      ) : (
        <input
          type={type}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
        />
      )}
    </label>
  );
}
