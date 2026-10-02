"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Campo, INPUT, MensajeError } from "@/components/ui/Campos";
import { ESTADO_INTERNACION, ahoraArgentinaInput, fechaHoraAR } from "@/lib/estadosInternacion";

interface InternacionResumen {
  id: string;
  estado: "INTERNADA" | "ALTA" | "DERIVADA" | "FALLECIDA";
  ingresoEn: string;
  egresoEn: string | null;
  motivo: string;
}

/** En la ficha de la mascota: aviso de internación activa, botón "Internar" y anteriores. */
export default function InternacionMascota({
  mascotaId,
  puedeInternar,
  usuarioNombre,
  fallecida,
}: {
  mascotaId: string;
  puedeInternar: boolean;
  usuarioNombre: string;
  fallecida: boolean;
}) {
  const router = useRouter();
  const [internaciones, setInternaciones] = useState<InternacionResumen[] | null>(null);
  const [form, setForm] = useState<{ ingresoEn: string; motivo: string; diagnostico: string; veterinario: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/internaciones?mascotaId=${mascotaId}`);
    if (!res.ok) return setInternaciones([]); // sin permiso de internados: no se muestra nada
    setInternaciones((await res.json()).internaciones ?? []);
  }, [mascotaId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar.
    cargar();
  }, [cargar]);

  async function internar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setEnviando(true);
    const res = await fetch("/api/internaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mascotaId, ...form }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) return setError(data.error ?? "No se pudo internar");
    router.push(`/admin/internaciones/${data.internacion.id}`);
  }

  if (!internaciones) return null;
  const activa = internaciones.find((i) => i.estado === "INTERNADA");
  const anteriores = internaciones.filter((i) => i.estado !== "INTERNADA");

  return (
    <div className="flex flex-col gap-2">
      {activa && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-mora-200 bg-mora-50 px-4 py-3 text-sm">
          <span className="text-mora-700">
            🏥 <strong>Internada</strong> desde el {fechaHoraAR(activa.ingresoEn)}
          </span>
          {puedeInternar ? (
            <Link href={`/admin/internaciones/${activa.id}`} className="font-medium text-mora-700 hover:underline">
              Ver internación →
            </Link>
          ) : (
            <Link href="/admin/internados" className="font-medium text-mora-700 hover:underline">
              Ver en Internados →
            </Link>
          )}
        </div>
      )}

      {puedeInternar && !activa && !fallecida && !form && (
        <button
          onClick={() => setForm({ ingresoEn: ahoraArgentinaInput(), motivo: "", diagnostico: "", veterinario: usuarioNombre })}
          className="btn-secondary w-fit rounded-md px-3 py-1.5 text-xs font-medium"
        >
          🏥 Internar
        </button>
      )}

      {form && (
        <form onSubmit={internar} className="flex flex-col gap-3 rounded-xl border-2 border-mora-200 bg-white p-4">
          <p className="font-display font-semibold text-humo-900">Internar</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Ingreso">
              <input type="datetime-local" required value={form.ingresoEn} onChange={(e) => setForm({ ...form, ingresoEn: e.target.value })} className={INPUT} />
            </Campo>
            <Campo etiqueta="Veterinario/a a cargo">
              <input required value={form.veterinario} onChange={(e) => setForm({ ...form, veterinario: e.target.value })} className={INPUT} />
            </Campo>
          </div>
          <Campo etiqueta="Motivo de la internación">
            <input required autoFocus value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className={INPUT} />
          </Campo>
          <Campo etiqueta="Diagnóstico (opcional)">
            <textarea rows={2} value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} className={INPUT} />
          </Campo>
          <MensajeError error={error} />
          <div className="flex gap-2">
            <button disabled={enviando} className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-60">
              Internar
            </button>
            <button type="button" onClick={() => setForm(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {puedeInternar && anteriores.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs font-medium text-[var(--color-primario)]">Internaciones anteriores ({anteriores.length})</summary>
          <ul className="mt-1 flex flex-col divide-y divide-humo-100 rounded-xl border border-humo-100 bg-white">
            {anteriores.map((i) => (
              <li key={i.id}>
                <Link href={`/admin/internaciones/${i.id}`} className="flex justify-between gap-2 px-4 py-2 hover:bg-mora-50">
                  <span>
                    {fechaHoraAR(i.ingresoEn)} · {i.motivo}
                  </span>
                  <span className="text-humo-500">{ESTADO_INTERNACION[i.estado]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
