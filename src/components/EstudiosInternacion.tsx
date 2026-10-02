"use client";

import { useState } from "react";
import { Campo, INPUT, MensajeError } from "@/components/ui/Campos";
import { TIPOS_ESTUDIO, ahoraArgentinaInput, fechaHoraAR } from "@/lib/estadosInternacion";
import { prepararArchivo } from "@/lib/archivos";

export interface Estudio {
  id: string;
  tipo: string;
  fecha: string;
  resultado: string | null;
  autor: string;
  adjuntos: { id: string; nombre: string; tipo: string; tamanio: number }[];
}

const ACEPTA = "image/jpeg,image/png,image/webp,application/pdf";

/** Sube los archivos de a uno; devuelve los que fallaron. */
async function subirArchivos(estudioId: string, archivos: File[]): Promise<string[]> {
  const fallidos: string[] = [];
  for (const original of archivos) {
    const fd = new FormData();
    fd.append("archivo", await prepararArchivo(original));
    const r = await fetch(`/api/estudios/${estudioId}/adjuntos`, { method: "POST", body: fd });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      fallidos.push(`${original.name}: ${d.error ?? "no se pudo subir"}`);
    }
  }
  return fallidos;
}

/** Estudios hechos durante la internación (análisis, radiografías...) con sus archivos. */
export default function EstudiosInternacion({
  internacionId,
  estudios,
  onCambio,
}: {
  internacionId: string;
  estudios: Estudio[];
  onCambio: () => Promise<void>;
}) {
  const [form, setForm] = useState<{ tipo: string; fecha: string; resultado: string } | null>(null);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setEnviando(true);
    const res = await fetch(`/api/internaciones/${internacionId}/estudios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setEnviando(false);
      return setError(data.error ?? "No se pudo guardar el estudio");
    }
    const fallidos = await subirArchivos(data.estudio.id, archivos);
    setEnviando(false);
    setForm(null);
    setArchivos([]);
    if (fallidos.length) setError(`El estudio se guardó, pero no se pudieron adjuntar: ${fallidos.join(" · ")}`);
    await onCambio();
  }

  async function agregarArchivos(estudioId: string, lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    setError(null);
    setEnviando(true);
    const fallidos = await subirArchivos(estudioId, Array.from(lista));
    setEnviando(false);
    if (fallidos.length) setError(`No se pudieron adjuntar: ${fallidos.join(" · ")}`);
    await onCambio();
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-humo-900">Estudios</h2>
        {!form && (
          <button
            onClick={() => setForm({ tipo: TIPOS_ESTUDIO[0], fecha: ahoraArgentinaInput(), resultado: "" })}
            className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
          >
            + Agregar estudio
          </button>
        )}
      </div>
      <MensajeError error={error} />

      {form && (
        <form onSubmit={guardar} className="flex flex-col gap-3 rounded-xl border border-humo-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Tipo de estudio">
              <input list="tipos-estudio" required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={INPUT} />
              <datalist id="tipos-estudio">
                {TIPOS_ESTUDIO.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Campo>
            <Campo etiqueta="Fecha">
              <input type="datetime-local" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={INPUT} />
            </Campo>
          </div>
          <Campo etiqueta="Resultado / observaciones (se puede completar después)">
            <textarea rows={3} value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })} className={INPUT} />
          </Campo>
          <Campo etiqueta="Archivos (fotos o PDF del estudio)">
            <input
              type="file"
              multiple
              accept={ACEPTA}
              onChange={(e) => setArchivos(Array.from(e.target.files ?? []))}
              className="text-sm text-humo-600 file:mr-3 file:rounded-md file:border-0 file:bg-mora-50 file:px-3 file:py-1.5 file:text-mora-700"
            />
          </Campo>
          <div className="flex gap-2">
            <button disabled={enviando} className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-60">
              {enviando ? "Guardando..." : "Guardar estudio"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {estudios.length === 0 ? (
        <p className="text-sm text-humo-500">No hay estudios cargados.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {estudios.map((e) => (
            <li key={e.id} className="flex flex-col gap-1.5 rounded-xl border border-humo-100 bg-white p-3 text-sm">
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-humo-900">{e.tipo}</span>
                <span className="text-xs text-humo-400">
                  {fechaHoraAR(e.fecha)} · {e.autor}
                </span>
              </p>
              {e.resultado && <p className="whitespace-pre-line text-humo-700">{e.resultado}</p>}
              <div className="flex flex-wrap items-center gap-2">
                {e.adjuntos.map((a) => (
                  <a
                    key={a.id}
                    href={`/api/adjuntos-estudio/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-humo-200 bg-humo-50 px-2.5 py-1 text-xs text-humo-700 hover:border-mora-300"
                  >
                    {a.tipo === "application/pdf" ? "📄" : "🖼️"} {a.nombre}
                  </a>
                ))}
                <label className="cursor-pointer text-xs font-medium text-[var(--color-primario)] hover:underline">
                  + Agregar archivos
                  <input type="file" multiple accept={ACEPTA} className="hidden" disabled={enviando} onChange={(ev) => agregarArchivos(e.id, ev.target.files)} />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
