"use client";

import { useEffect, useState, useCallback } from "react";

interface DiaCerrado {
  id: string;
  fecha: string;
  motivo: string | null;
}

const NOMBRES_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const fechaAlMediodia = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const diaSemana = fechaAlMediodia.getUTCDay();
  return `${NOMBRES_DIA[diaSemana]} ${d} de ${NOMBRES_MES[m - 1]} de ${y}`;
}

export default function DiasCerradosPanel() {
  const [dias, setDias] = useState<DiaCerrado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoMotivo, setNuevoMotivo] = useState("");

  const cargarDias = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/dias-cerrados");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudieron cargar los días cerrados");
      setDias(data.diasCerrados ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar.
    cargarDias();
  }, [cargarDias]);

  async function agregarDia(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nuevaFecha) {
      setError("Elegí una fecha");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch("/api/dias-cerrados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: nuevaFecha, motivo: nuevoMotivo || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar");
        return;
      }
      setNuevaFecha("");
      setNuevoMotivo("");
      await cargarDias();
    } finally {
      setGuardando(false);
    }
  }

  async function quitarDia(id: string) {
    setError(null);
    const res = await fetch(`/api/dias-cerrados/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo quitar la fecha");
      return;
    }
    await cargarDias();
  }

  if (cargando) return <p className="text-sm text-humo-500">Cargando días cerrados...</p>;

  return (
    <section className="card-suave rounded-xl border border-humo-200 bg-white p-4">
      <h2 className="font-display font-semibold text-humo-900">Días sin atención</h2>
      <p className="mb-3 mt-0.5 text-xs text-humo-500">
        Feriados o cierres especiales. Esos días no van a aparecer disponibles para reservar, sin importar el
        horario habitual de esa fecha.
      </p>

      {error && <div className="mb-3 rounded-lg bg-peligro-50 px-3 py-2 text-sm text-peligro-600">{error}</div>}

      <form onSubmit={agregarDia} className="mb-4 flex flex-wrap items-end gap-2 rounded-lg bg-humo-50 p-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-humo-600">Fecha</span>
          <input
            type="date"
            required
            value={nuevaFecha}
            onChange={(e) => setNuevaFecha(e.target.value)}
            className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-humo-600">Motivo (opcional)</span>
          <input
            value={nuevoMotivo}
            onChange={(e) => setNuevoMotivo(e.target.value)}
            placeholder="Ej: Feriado, vacaciones"
            className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
          />
        </label>
        <button type="submit" disabled={guardando} className="btn-primary rounded-lg px-4 py-2 text-sm">
          {guardando ? "Agregando..." : "+ Agregar"}
        </button>
      </form>

      {dias.length === 0 ? (
        <p className="text-sm text-humo-500">No hay fechas cerradas cargadas.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {dias.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-humo-100 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium capitalize text-humo-900">{formatearFecha(d.fecha)}</p>
                {d.motivo && <p className="text-xs text-humo-500">{d.motivo}</p>}
              </div>
              <button
                onClick={() => quitarDia(d.id)}
                className="text-xs text-peligro-500 hover:underline"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
