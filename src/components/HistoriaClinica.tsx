"use client";

import { useCallback, useEffect, useState } from "react";
import { formatearFecha } from "@/lib/formatoFichas";
import { getFechaHoyArgentina } from "@/lib/disponibilidad";

interface Adjunto {
  id: string;
  nombre: string;
  tipo: string;
  tamanio: number;
}

interface Consulta {
  id: string;
  fecha: string;
  motivo: string;
  anamnesis: string | null;
  pesoKg: number | null;
  temperatura: number | null;
  frecuenciaCardiaca: number | null;
  frecuenciaRespiratoria: number | null;
  condicionCorporal: number | null;
  mucosas: string | null;
  hidratacion: string | null;
  examen: string | null;
  diagnostico: string | null;
  tratamiento: string | null;
  estudios: string | null;
  proximoControl: string | null;
  autorNombre: string;
  adjuntos: Adjunto[];
  _count: { cambios: number };
}

type CampoConsulta = Exclude<keyof Consulta, "id" | "autorNombre" | "adjuntos" | "_count">;

interface Cambio {
  id: string;
  datosAnteriores: Record<string, string | number | null>;
  editadoPor: string;
  createdAt: string;
}

type FormConsulta = Record<CampoConsulta, string>;

const CAMPOS_TEXTO: CampoConsulta[] = [
  "fecha",
  "motivo",
  "anamnesis",
  "mucosas",
  "hidratacion",
  "examen",
  "diagnostico",
  "tratamiento",
  "estudios",
  "proximoControl",
];
const CAMPOS_NUMERO: CampoConsulta[] = [
  "pesoKg",
  "temperatura",
  "frecuenciaCardiaca",
  "frecuenciaRespiratoria",
  "condicionCorporal",
];

const ETIQUETAS: Record<CampoConsulta, string> = {
  fecha: "Fecha",
  motivo: "Motivo",
  anamnesis: "Lo que cuenta el tutor",
  pesoKg: "Peso",
  temperatura: "Temperatura",
  frecuenciaCardiaca: "Frec. cardíaca",
  frecuenciaRespiratoria: "Frec. respiratoria",
  condicionCorporal: "Condición corporal",
  mucosas: "Mucosas",
  hidratacion: "Hidratación",
  examen: "Examen",
  diagnostico: "Diagnóstico",
  tratamiento: "Tratamiento e indicaciones",
  estudios: "Estudios",
  proximoControl: "Próximo control",
};

const CONDICION_CORPORAL = [
  { valor: "1", texto: "1 · Emaciado" },
  { valor: "2", texto: "2 · Muy delgado" },
  { valor: "3", texto: "3 · Delgado" },
  { valor: "4", texto: "4 · Ideal" },
  { valor: "5", texto: "5 · Ideal" },
  { valor: "6", texto: "6 · Sobrepeso" },
  { valor: "7", texto: "7 · Sobrepeso" },
  { valor: "8", texto: "8 · Obeso" },
  { valor: "9", texto: "9 · Obesidad severa" },
];
const MUCOSAS = ["Rosadas (normales)", "Pálidas", "Congestivas", "Ictéricas", "Cianóticas"];
const HIDRATACION = ["Normal", "Deshidratación leve (5–6 %)", "Deshidratación moderada (7–9 %)", "Deshidratación grave (10 % o más)"];

// Rangos de referencia orientativos (perro / gato adultos) — solo para marcar valores
// llamativos; no bloquean nada, el criterio es siempre del veterinario.
const RANGOS: Record<string, Partial<Record<"temperatura" | "frecuenciaCardiaca" | "frecuenciaRespiratoria", [number, number]>>> = {
  Perro: { temperatura: [38.3, 39.2], frecuenciaCardiaca: [60, 160], frecuenciaRespiratoria: [10, 30] },
  Gato: { temperatura: [38.0, 39.2], frecuenciaCardiaca: [140, 220], frecuenciaRespiratoria: [20, 42] },
};

const INPUT =
  "w-full rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100";

function formVacio(fecha: string, motivo = ""): FormConsulta {
  const f = {} as FormConsulta;
  for (const c of [...CAMPOS_TEXTO, ...CAMPOS_NUMERO]) f[c] = "";
  f.fecha = fecha;
  f.motivo = motivo;
  return f;
}

function formDesde(c: Consulta): FormConsulta {
  const f = {} as FormConsulta;
  for (const campo of [...CAMPOS_TEXTO, ...CAMPOS_NUMERO]) {
    const v = c[campo];
    f[campo] = v == null ? "" : String(v).replace(".", campo === "pesoKg" || campo === "temperatura" ? "," : ".");
  }
  return f;
}

function aNumero(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function formatearValor(campo: CampoConsulta, v: string | number | null): string {
  if (v == null || v === "") return "—";
  if (campo === "fecha" || campo === "proximoControl") return formatearFecha(String(v));
  if (campo === "pesoKg") return `${Number(v).toLocaleString("es-AR")} kg`;
  if (campo === "temperatura") return `${Number(v).toLocaleString("es-AR")} °C`;
  if (campo === "frecuenciaCardiaca") return `${v} lpm`;
  if (campo === "frecuenciaRespiratoria") return `${v} rpm`;
  if (campo === "condicionCorporal") return `${v}/9`;
  return String(v);
}

/** Achica fotos grandes antes de subirlas (el celular saca fotos de 4–8 MB). */
async function prepararArchivo(archivo: File): Promise<File> {
  if (!archivo.type.startsWith("image/") || archivo.size < 1.5 * 1024 * 1024) return archivo;
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (!blob) return archivo;
    return new File([blob], archivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return archivo;
  }
}

export default function HistoriaClinica({
  mascotaId,
  especie,
  turnoInicial,
  onGuardado,
}: {
  mascotaId: string;
  especie: string | null;
  turnoInicial: { id: string; fecha: string; motivo: string } | null;
  onGuardado: () => void;
}) {
  const [consultas, setConsultas] = useState<Consulta[] | null>(null);
  // editando: "nueva" | id de consulta | null
  const [editando, setEditando] = useState<string | null>(turnoInicial ? "nueva" : null);
  const [form, setForm] = useState<FormConsulta>(() =>
    formVacio(turnoInicial?.fecha ?? getFechaHoyArgentina(), turnoInicial?.motivo ?? "")
  );
  const [turnoId, setTurnoId] = useState<string | null>(turnoInicial?.id ?? null);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cambiosAbiertos, setCambiosAbiertos] = useState<Record<string, Cambio[]>>({});

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/consultas?mascotaId=${mascotaId}`);
    const data = await res.json();
    setConsultas(data.consultas ?? []);
  }, [mascotaId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar.
    cargar();
  }, [cargar]);

  function abrirNueva() {
    setForm(formVacio(getFechaHoyArgentina()));
    setTurnoId(null);
    setArchivos([]);
    setError(null);
    setEditando("nueva");
  }

  function abrirEdicion(c: Consulta) {
    setForm(formDesde(c));
    setArchivos([]);
    setError(null);
    setEditando(c.id);
  }

  function set(campo: CampoConsulta, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: Record<string, string | number | null> = {};
    for (const c of CAMPOS_TEXTO) payload[c] = form[c];
    for (const c of CAMPOS_NUMERO) {
      const n = aNumero(form[c]);
      if (Number.isNaN(n)) {
        setError(`Revisá el campo "${ETIQUETAS[c]}": tiene que ser un número.`);
        return;
      }
      payload[c] = n;
    }

    setGuardando(true);
    const esNueva = editando === "nueva";
    const res = await fetch(esNueva ? "/api/consultas" : `/api/consultas/${editando}`, {
      method: esNueva ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(esNueva ? { ...payload, mascotaId, turnoId } : payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setGuardando(false);
      setError(data.error ?? "No se pudo guardar la consulta");
      return;
    }

    // Adjuntos: uno por uno; si alguno falla, la consulta igual queda guardada.
    const fallidos: string[] = [];
    for (const original of archivos) {
      const archivo = await prepararArchivo(original);
      const fd = new FormData();
      fd.append("archivo", archivo);
      const r = await fetch(`/api/consultas/${data.consulta.id}/adjuntos`, { method: "POST", body: fd });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        fallidos.push(`${original.name}: ${d.error ?? "no se pudo subir"}`);
      }
    }

    setGuardando(false);
    setEditando(null);
    setArchivos([]);
    setTurnoId(null);
    if (fallidos.length) setError(`La consulta se guardó, pero no se pudieron adjuntar: ${fallidos.join(" · ")}`);
    await cargar();
    onGuardado();
  }

  async function verCambios(id: string) {
    if (cambiosAbiertos[id]) {
      setCambiosAbiertos((abiertos) => {
        const resto = { ...abiertos };
        delete resto[id];
        return resto;
      });
      return;
    }
    const res = await fetch(`/api/consultas/${id}/cambios`);
    const data = await res.json();
    setCambiosAbiertos((a) => ({ ...a, [id]: data.cambios ?? [] }));
  }

  const rangos = especie ? RANGOS[especie] : undefined;
  function marca(campo: "temperatura" | "frecuenciaCardiaca" | "frecuenciaRespiratoria", v: number | null): string {
    const r = rangos?.[campo];
    if (!r || v == null) return "";
    if (v < r[0]) return " ↓";
    if (v > r[1]) return " ↑";
    return "";
  }

  const formulario = (
    <form onSubmit={guardar} className="flex flex-col gap-3 rounded-xl border-2 border-mora-200 bg-white p-4">
      <p className="font-display font-semibold text-humo-900">
        {editando === "nueva" ? "Nueva consulta" : "Corregir consulta"}
      </p>
      {editando !== "nueva" && (
        <p className="text-xs text-humo-500">La versión anterior queda guardada: se puede ver desde &quot;Ver cambios&quot;.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Campo etiqueta="Fecha">
          <input type="date" required value={form.fecha} onChange={(e) => set("fecha", e.target.value)} className={INPUT} />
        </Campo>
        <Campo etiqueta="Motivo de la consulta *">
          <input
            required
            value={form.motivo}
            onChange={(e) => set("motivo", e.target.value)}
            placeholder="Ej: vómitos, control, vacunación"
            className={INPUT}
          />
        </Campo>
      </div>

      <Campo etiqueta="Lo que cuenta el tutor (síntomas, desde cuándo, apetito...)">
        <textarea rows={2} value={form.anamnesis} onChange={(e) => set("anamnesis", e.target.value)} className={INPUT} />
      </Campo>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Campo etiqueta="Peso (kg)">
          <input inputMode="decimal" value={form.pesoKg} onChange={(e) => set("pesoKg", e.target.value)} placeholder="12,5" className={INPUT} />
        </Campo>
        <Campo etiqueta="Temp. (°C)">
          <input inputMode="decimal" value={form.temperatura} onChange={(e) => set("temperatura", e.target.value)} placeholder="38,5" className={INPUT} />
        </Campo>
        <Campo etiqueta="Frec. cardíaca">
          <input inputMode="numeric" value={form.frecuenciaCardiaca} onChange={(e) => set("frecuenciaCardiaca", e.target.value)} placeholder="lpm" className={INPUT} />
        </Campo>
        <Campo etiqueta="Frec. respiratoria">
          <input inputMode="numeric" value={form.frecuenciaRespiratoria} onChange={(e) => set("frecuenciaRespiratoria", e.target.value)} placeholder="rpm" className={INPUT} />
        </Campo>
      </div>

      <details className="rounded-lg bg-humo-50 px-3 py-2" open={Boolean(form.condicionCorporal || form.mucosas || form.hidratacion || form.examen)}>
        <summary className="cursor-pointer text-sm font-medium text-humo-700">Más datos del examen</summary>
        <div className="mt-3 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Condición corporal">
              <select value={form.condicionCorporal} onChange={(e) => set("condicionCorporal", e.target.value)} className={`${INPUT} bg-white`}>
                <option value="">Sin dato</option>
                {CONDICION_CORPORAL.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.texto}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Mucosas">
              <select value={form.mucosas} onChange={(e) => set("mucosas", e.target.value)} className={`${INPUT} bg-white`}>
                <option value="">Sin dato</option>
                {MUCOSAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Hidratación">
              <select value={form.hidratacion} onChange={(e) => set("hidratacion", e.target.value)} className={`${INPUT} bg-white`}>
                <option value="">Sin dato</option>
                {HIDRATACION.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo etiqueta="Hallazgos del examen">
            <textarea rows={2} value={form.examen} onChange={(e) => set("examen", e.target.value)} className={`${INPUT} bg-white`} />
          </Campo>
        </div>
      </details>

      <Campo etiqueta="Diagnóstico">
        <textarea rows={2} value={form.diagnostico} onChange={(e) => set("diagnostico", e.target.value)} className={INPUT} />
      </Campo>
      <Campo etiqueta="Tratamiento e indicaciones">
        <textarea
          rows={3}
          value={form.tratamiento}
          onChange={(e) => set("tratamiento", e.target.value)}
          placeholder="Ej: Amoxicilina 250 mg, 1 comprimido cada 12 h durante 7 días. Dieta blanda."
          className={INPUT}
        />
      </Campo>
      <Campo etiqueta="Estudios (pedidos o resultados)">
        <textarea rows={2} value={form.estudios} onChange={(e) => set("estudios", e.target.value)} className={INPUT} />
      </Campo>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Próximo control">
          <input type="date" value={form.proximoControl} onChange={(e) => set("proximoControl", e.target.value)} className={INPUT} />
        </Campo>
        <Campo etiqueta="Adjuntar análisis, radiografías o recetas (fotos o PDF)">
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setArchivos(Array.from(e.target.files ?? []))}
            className="text-sm text-humo-600 file:mr-3 file:rounded-md file:border-0 file:bg-mora-50 file:px-3 file:py-1.5 file:text-mora-700"
          />
        </Campo>
      </div>

      {error && <div className="rounded-xl bg-peligro-50 px-4 py-2 text-sm text-peligro-600">{error}</div>}

      <div className="flex gap-2">
        <button type="submit" disabled={guardando} className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-60">
          {guardando ? "Guardando..." : "Guardar consulta"}
        </button>
        <button
          type="button"
          disabled={guardando}
          onClick={() => {
            setEditando(null);
            setError(null);
          }}
          className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium"
        >
          Cancelar
        </button>
      </div>
    </form>
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-humo-900">Historia clínica</h2>
        {editando === null && (
          <button onClick={abrirNueva} className="btn-primary rounded-lg px-4 py-2 text-sm">
            + Nueva consulta
          </button>
        )}
      </div>

      {editando === null && error && (
        <div className="rounded-xl bg-peligro-50 px-4 py-2 text-sm text-peligro-600">{error}</div>
      )}

      {editando === "nueva" && formulario}

      {consultas === null ? (
        <p className="text-sm text-humo-500">Cargando historia clínica...</p>
      ) : consultas.length === 0 && editando !== "nueva" ? (
        <p className="text-sm text-humo-500">Todavía no hay consultas cargadas. Tocá &quot;+ Nueva consulta&quot; para empezar.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {consultas.map((c) =>
            editando === c.id ? (
              <li key={c.id}>{formulario}</li>
            ) : (
              <li key={c.id} className="card-suave flex flex-col gap-2 rounded-xl border border-humo-100 bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-humo-900">
                    <span className="tabular-nums">{formatearFecha(c.fecha)}</span> · {c.motivo}
                  </p>
                  <p className="text-xs text-humo-400">{c.autorNombre}</p>
                </div>

                {(c.pesoKg != null || c.temperatura != null || c.frecuenciaCardiaca != null || c.frecuenciaRespiratoria != null || c.condicionCorporal != null) && (
                  <div className="flex flex-wrap gap-1.5 text-xs tabular-nums">
                    {c.pesoKg != null && <Chip>{formatearValor("pesoKg", c.pesoKg)}</Chip>}
                    {c.temperatura != null && (
                      <Chip alerta={!!marca("temperatura", c.temperatura)}>
                        {formatearValor("temperatura", c.temperatura)}
                        {marca("temperatura", c.temperatura)}
                      </Chip>
                    )}
                    {c.frecuenciaCardiaca != null && (
                      <Chip alerta={!!marca("frecuenciaCardiaca", c.frecuenciaCardiaca)}>
                        FC {formatearValor("frecuenciaCardiaca", c.frecuenciaCardiaca)}
                        {marca("frecuenciaCardiaca", c.frecuenciaCardiaca)}
                      </Chip>
                    )}
                    {c.frecuenciaRespiratoria != null && (
                      <Chip alerta={!!marca("frecuenciaRespiratoria", c.frecuenciaRespiratoria)}>
                        FR {formatearValor("frecuenciaRespiratoria", c.frecuenciaRespiratoria)}
                        {marca("frecuenciaRespiratoria", c.frecuenciaRespiratoria)}
                      </Chip>
                    )}
                    {c.condicionCorporal != null && <Chip>CC {formatearValor("condicionCorporal", c.condicionCorporal)}</Chip>}
                  </div>
                )}

                <dl className="flex flex-col gap-1.5 text-sm">
                  <Bloque etiqueta="Lo que cuenta el tutor" valor={c.anamnesis} />
                  <Bloque
                    etiqueta="Examen"
                    valor={[c.mucosas && `Mucosas: ${c.mucosas}`, c.hidratacion && `Hidratación: ${c.hidratacion}`, c.examen]
                      .filter(Boolean)
                      .join("\n") || null}
                  />
                  <Bloque etiqueta="Diagnóstico" valor={c.diagnostico} destacado />
                  <Bloque etiqueta="Tratamiento e indicaciones" valor={c.tratamiento} destacado />
                  <Bloque etiqueta="Estudios" valor={c.estudios} />
                  <Bloque etiqueta="Próximo control" valor={c.proximoControl ? formatearFecha(c.proximoControl) : null} />
                </dl>

                {c.adjuntos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {c.adjuntos.map((a) => (
                      <a
                        key={a.id}
                        href={`/api/adjuntos/${a.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-humo-200 bg-humo-50 px-2.5 py-1 text-xs text-humo-700 hover:border-mora-300"
                      >
                        {a.tipo === "application/pdf" ? "📄" : "🖼️"} {a.nombre}
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 border-t border-humo-100 pt-2 text-xs">
                  {editando === null && (
                    <button onClick={() => abrirEdicion(c)} className="font-medium text-[var(--color-primario)] hover:underline">
                      Corregir o agregar datos
                    </button>
                  )}
                  {c._count.cambios > 0 && (
                    <button onClick={() => verCambios(c.id)} className="text-humo-500 hover:text-humo-800">
                      {cambiosAbiertos[c.id]
                        ? "Ocultar cambios"
                        : `Corregida ${c._count.cambios === 1 ? "1 vez" : `${c._count.cambios} veces`} · ver cambios`}
                    </button>
                  )}
                </div>

                {cambiosAbiertos[c.id] && <ListaCambios consulta={c} cambios={cambiosAbiertos[c.id]} />}
              </li>
            )
          )}
        </ol>
      )}
    </section>
  );
}

/** Para cada corrección muestra qué campos cambiaron y qué decían antes. */
function ListaCambios({ consulta, cambios }: { consulta: Consulta; cambios: Cambio[] }) {
  // cambios viene del más reciente al más viejo; la versión "posterior" a cada cambio
  // es la del cambio anterior en la lista (o la consulta actual para el primero).
  return (
    <ul className="flex flex-col gap-2 rounded-lg bg-humo-50 p-3 text-xs">
      {cambios.map((cambio, i) => {
        const posterior: Record<string, unknown> = i === 0 ? { ...consulta } : cambios[i - 1].datosAnteriores;
        const campos = (Object.keys(ETIQUETAS) as CampoConsulta[]).filter(
          (k) => (cambio.datosAnteriores[k] ?? null) !== (posterior[k] ?? null)
        );
        return (
          <li key={cambio.id}>
            <p className="font-medium text-humo-700">
              {new Date(cambio.createdAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })} · {cambio.editadoPor}
            </p>
            {campos.map((k) => (
              <p key={k} className="text-humo-600">
                {ETIQUETAS[k]}: antes decía <span className="italic">&quot;{formatearValor(k, cambio.datosAnteriores[k])}&quot;</span>
              </p>
            ))}
          </li>
        );
      })}
    </ul>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-humo-600">{etiqueta}</span>
      {children}
    </label>
  );
}

function Chip({ children, alerta = false }: { children: React.ReactNode; alerta?: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 ${alerta ? "bg-alerta-50 font-medium text-alerta-600" : "bg-celeste-50 text-celeste-700"}`}>
      {children}
    </span>
  );
}

function Bloque({ etiqueta, valor, destacado = false }: { etiqueta: string; valor: string | null; destacado?: boolean }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs text-humo-400">{etiqueta}</dt>
      <dd className={`whitespace-pre-line ${destacado ? "text-humo-900" : "text-humo-700"}`}>{valor}</dd>
    </div>
  );
}
