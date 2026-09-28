"use client";

import { useCallback, useEffect, useState } from "react";
import EditorAplicacion, { APLICACION_VACIA, type AplicacionForm } from "@/components/EditorAplicacion";
import { formatearFecha } from "@/lib/formatoFichas";
import { getFechaHoyArgentina } from "@/lib/disponibilidad";
import { TIPO_LABEL, type TipoAplicacion } from "@/lib/planSanitario";

interface Aplicacion {
  id: string;
  tipo: TipoAplicacion;
  producto: string;
  lote: string | null;
  fecha: string;
  proximaFecha: string | null;
  aplicadoPor: string;
  resuelta: boolean;
}

/**
 * Carnet de vacunas y desparasitaciones de la mascota. Lo ve quien vea la ficha;
 * registrar (y cambiar fechas) solo el veterinario.
 */
export default function PlanSanitario({
  mascotaId,
  puedeRegistrar,
  recargar,
}: {
  mascotaId: string;
  puedeRegistrar: boolean;
  recargar: number;
}) {
  const [aplicaciones, setAplicaciones] = useState<Aplicacion[] | null>(null);
  const [nueva, setNueva] = useState<(AplicacionForm & { fecha: string }) | null>(null);
  const [verTodo, setVerTodo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/aplicaciones?mascotaId=${mascotaId}`);
    const data = await res.json();
    setAplicaciones(data.aplicaciones ?? []);
  }, [mascotaId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial y al guardar una consulta con vacunas.
    cargar();
  }, [cargar, recargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nueva) return;
    setError(null);
    const res = await fetch("/api/aplicaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nueva, mascotaId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo registrar");
      return;
    }
    setNueva(null);
    await cargar();
  }

  const hoy = getFechaHoyArgentina();
  const pendientes = (aplicaciones ?? []).filter((a) => !a.resuelta && a.proximaFecha);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-humo-900">Vacunas y desparasitaciones</h2>
        {puedeRegistrar && !nueva && (
          <button
            onClick={() => setNueva({ ...APLICACION_VACIA, fecha: hoy })}
            className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
          >
            + Registrar
          </button>
        )}
      </div>

      {nueva && (
        <form onSubmit={guardar} className="flex flex-col gap-2 rounded-xl border border-humo-200 bg-white p-4">
          <p className="text-xs text-humo-500">
            Para cargar vacunas anteriores (por ejemplo, del carnet en papel). Si la aplicás en una consulta, cargala desde la consulta.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-humo-600">Fecha en que se aplicó:</span>
            <input
              type="date"
              required
              value={nueva.fecha}
              onChange={(e) => setNueva({ ...nueva, fecha: e.target.value })}
              className="rounded-lg border border-humo-200 px-2 py-1"
            />
          </label>
          <EditorAplicacion valor={nueva} fechaBase={nueva.fecha} onChange={(v) => setNueva({ ...nueva, ...v })} />
          {error && <div className="rounded-xl bg-peligro-50 px-4 py-2 text-sm text-peligro-600">{error}</div>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm">
              Guardar
            </button>
            <button type="button" onClick={() => setNueva(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {aplicaciones === null ? (
        <p className="text-sm text-humo-500">Cargando...</p>
      ) : aplicaciones.length === 0 ? (
        <p className="text-sm text-humo-500">No tiene vacunas ni desparasitaciones registradas.</p>
      ) : (
        <>
          {pendientes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendientes.map((a) => {
                const vencida = a.proximaFecha! < hoy;
                return (
                  <span
                    key={a.id}
                    className={`rounded-lg px-3 py-1.5 text-sm ${vencida ? "bg-peligro-50 text-peligro-600" : "bg-exito-50 text-exito-600"}`}
                  >
                    {vencida ? "Vencida: " : "Próxima: "}
                    <strong>{a.producto}</strong> · {formatearFecha(a.proximaFecha!)}
                  </span>
                );
              })}
            </div>
          )}
          <button onClick={() => setVerTodo(!verTodo)} className="w-fit text-xs font-medium text-[var(--color-primario)] hover:underline">
            {verTodo ? "Ocultar carnet completo" : `Ver carnet completo (${aplicaciones.length})`}
          </button>
          {verTodo && (
            <ul className="flex flex-col divide-y divide-humo-100 rounded-xl border border-humo-100 bg-white text-sm">
              {aplicaciones.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2">
                  <span>
                    <span className="tabular-nums">{formatearFecha(a.fecha)}</span> · <strong>{a.producto}</strong>
                    <span className="text-humo-500"> · {TIPO_LABEL[a.tipo]}</span>
                    {a.lote && <span className="text-humo-400"> · lote {a.lote}</span>}
                  </span>
                  <span className="text-xs text-humo-400">{a.aplicadoPor}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
