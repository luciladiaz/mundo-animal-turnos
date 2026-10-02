"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Campo, INPUT, MensajeError } from "@/components/ui/Campos";
import { COLOR_ESTADO_PARTE, ESTADO_INTERNACION, ESTADO_PARTE, fechaHoraAR, type EstadoParte } from "@/lib/estadosInternacion";

interface Toma {
  id: string;
  administradaEn: string;
  administradaPor: string;
  observaciones: string | null;
}
interface Medicacion {
  id: string;
  medicamento: string;
  dosis: string;
  via: string | null;
  frecuenciaHoras: number | null;
  indicaciones: string | null;
  activa: boolean;
  creadaPor: string;
  createdAt: string;
  suspendidaEn: string | null;
  suspendidaPor: string | null;
  tomas: Toma[];
}
interface Parte {
  id: string;
  estado: EstadoParte;
  parteFamilia: string;
  notaClinica: string | null;
  autor: string;
  enviadoEn: string | null;
  enviadoPor: string | null;
  createdAt: string;
}
interface Internacion {
  id: string;
  estado: "INTERNADA" | "ALTA" | "DERIVADA" | "FALLECIDA";
  ingresoEn: string;
  motivo: string;
  diagnostico: string | null;
  veterinario: string;
  creadaPor: string;
  egresoEn: string | null;
  egresoPor: string | null;
  notaEgreso: string | null;
  indicacionesAlta: string | null;
  mascota: { id: string; nombre: string; especie: string | null; alertas: string | null; tutor: { id: string; nombre: string; telefono: string } };
  partes: Parte[];
  medicaciones: Medicacion[];
}

const FRECUENCIAS = [
  { valor: "", texto: "Según necesidad" },
  { valor: "4", texto: "Cada 4 horas" },
  { valor: "6", texto: "Cada 6 horas" },
  { valor: "8", texto: "Cada 8 horas" },
  { valor: "12", texto: "Cada 12 horas" },
  { valor: "24", texto: "Cada 24 horas" },
];

/** Estado de la próxima toma, para la hoja de medicación. */
function estadoToma(m: Medicacion, ahora: number): { texto: string; clase: string } | null {
  if (!m.activa || !m.frecuenciaHoras) return null;
  const ultima = m.tomas[0]?.administradaEn;
  const proxima = ultima ? new Date(ultima).getTime() + m.frecuenciaHoras * 3_600_000 : new Date(m.createdAt).getTime();
  const minutos = Math.round((proxima - ahora) / 60_000);
  if (!ultima) return { texto: "Todavía no se dio ninguna toma", clase: "bg-alerta-50 text-alerta-600" };
  if (minutos <= -15) {
    const h = Math.floor(-minutos / 60);
    const min = -minutos % 60;
    return { texto: `ATRASADA ${h ? `${h} h ` : ""}${min} min (tocaba ${fechaHoraAR(new Date(proxima))})`, clase: "bg-peligro-50 text-peligro-600" };
  }
  if (minutos <= 15) return { texto: "Toca ahora", clase: "bg-alerta-50 text-alerta-600" };
  return { texto: `Próxima: ${fechaHoraAR(new Date(proxima))}`, clase: "bg-humo-50 text-humo-600" };
}

export default function InternacionDetalle({ id }: { id: string }) {
  const [internacion, setInternacion] = useState<Internacion | null>(null);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [parte, setParte] = useState<{ estado: EstadoParte; parteFamilia: string; notaClinica: string } | null>(null);
  const [med, setMed] = useState<{ medicamento: string; dosis: string; via: string; frecuencia: string; indicaciones: string } | null>(null);
  const [egreso, setEgreso] = useState<{ tipo: "ALTA" | "DERIVADA" | "FALLECIDA"; indicacionesAlta: string; notaEgreso: string } | null>(null);
  const [tomasAbiertas, setTomasAbiertas] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/internaciones/${id}`);
    if (!res.ok) return setNoEncontrada(true);
    setInternacion((await res.json()).internacion);
    setAhora(Date.now());
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial; se refresca cada minuto (horarios de medicación).
    cargar();
    const t = setInterval(cargar, 60_000);
    return () => clearInterval(t);
  }, [cargar]);

  async function enviar(url: string, metodo: string, cuerpo: object | null, alTerminar: () => void) {
    setError(null);
    setEnviando(true);
    const res = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    setEnviando(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "No se pudo guardar");
    alTerminar();
    await cargar();
  }

  if (noEncontrada) return <p className="text-sm text-humo-500">No se encontró esta internación.</p>;
  if (!internacion) return <p className="text-sm text-humo-500">Cargando...</p>;
  const activa = internacion.estado === "INTERNADA";
  const i = internacion;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/admin/internados" className="text-humo-500 hover:text-humo-800">
          ← Internados
        </Link>
        <Link href={`/admin/mascotas/${i.mascota.id}`} className="text-humo-500 hover:text-humo-800">
          Ficha de {i.mascota.nombre}
        </Link>
      </div>

      {i.mascota.alertas && (
        <div className="rounded-xl border border-peligro-500/30 bg-peligro-50 px-4 py-3 text-sm text-peligro-600">
          <p className="font-semibold">⚠️ Alertas</p>
          <p className="whitespace-pre-line">{i.mascota.alertas}</p>
        </div>
      )}

      <section className="card-suave flex flex-col gap-1 rounded-xl border border-humo-100 bg-white p-4 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="font-display text-xl font-semibold text-humo-900">
            Internación de {i.mascota.nombre}
            {i.mascota.especie && <span className="text-sm font-normal text-humo-400"> · {i.mascota.especie}</span>}
          </h1>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${activa ? "bg-mora-50 text-mora-700" : "bg-humo-100 text-humo-600"}`}>
            {ESTADO_INTERNACION[i.estado]}
          </span>
        </div>
        <p className="text-humo-600">
          {i.mascota.tutor.nombre} · {i.mascota.tutor.telefono}
        </p>
        <p className="text-humo-600">
          Ingreso: {fechaHoraAR(i.ingresoEn)} · a cargo de {i.veterinario}
        </p>
        <p className="text-humo-800">
          <span className="text-humo-400">Motivo:</span> {i.motivo}
        </p>
        {i.diagnostico && (
          <p className="text-humo-800">
            <span className="text-humo-400">Diagnóstico:</span> {i.diagnostico}
          </p>
        )}
        {i.egresoEn && (
          <div className="mt-2 rounded-lg bg-humo-50 p-3">
            <p className="font-medium text-humo-800">
              {ESTADO_INTERNACION[i.estado]} el {fechaHoraAR(i.egresoEn)} · {i.egresoPor}
            </p>
            {i.indicacionesAlta && <p className="whitespace-pre-line text-humo-700">Indicaciones para la casa: {i.indicacionesAlta}</p>}
            {i.notaEgreso && <p className="whitespace-pre-line text-humo-500">Nota clínica: {i.notaEgreso}</p>}
          </div>
        )}
      </section>

      <MensajeError error={error} />

      {/* Partes */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-humo-900">Partes de evolución</h2>
          {activa && !parte && (
            <button onClick={() => setParte({ estado: "ESTABLE", parteFamilia: "", notaClinica: "" })} className="btn-primary rounded-lg px-4 py-2 text-sm">
              + Nuevo parte
            </button>
          )}
        </div>
        {parte && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(`/api/internaciones/${id}/partes`, "POST", parte, () => setParte(null));
            }}
            className="flex flex-col gap-3 rounded-xl border-2 border-mora-200 bg-white p-4"
          >
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ESTADO_PARTE) as EstadoParte[]).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setParte({ ...parte, estado: e })}
                  className={`rounded-full border px-3 py-1.5 text-sm ${parte.estado === e ? `${COLOR_ESTADO_PARTE[e]} border-transparent font-medium` : "border-humo-200 text-humo-600"}`}
                >
                  {ESTADO_PARTE[e].emoji} {ESTADO_PARTE[e].texto}
                </button>
              ))}
            </div>
            <Campo etiqueta="Parte para la familia (lo que la secretaria le manda al tutor, en palabras simples)">
              <textarea
                required
                rows={3}
                value={parte.parteFamilia}
                onChange={(e) => setParte({ ...parte, parteFamilia: e.target.value })}
                placeholder="Ej: Hoy amaneció más animada, comió un poquito y sigue con el suero."
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Nota clínica (solo la ve el veterinario)">
              <textarea rows={3} value={parte.notaClinica} onChange={(e) => setParte({ ...parte, notaClinica: e.target.value })} className={INPUT} />
            </Campo>
            <div className="flex gap-2">
              <button disabled={enviando} className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-60">
                Guardar parte
              </button>
              <button type="button" onClick={() => setParte(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
                Cancelar
              </button>
            </div>
          </form>
        )}
        {i.partes.length === 0 ? (
          <p className="text-sm text-humo-500">Todavía no hay partes.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {i.partes.map((p) => (
              <li key={p.id} className="flex flex-col gap-1.5 rounded-xl border border-humo-100 bg-white p-3 text-sm">
                <p className="flex flex-wrap items-center gap-2 text-xs text-humo-500">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${COLOR_ESTADO_PARTE[p.estado]}`}>
                    {ESTADO_PARTE[p.estado].emoji} {ESTADO_PARTE[p.estado].texto}
                  </span>
                  {fechaHoraAR(p.createdAt)} · {p.autor}
                  {p.enviadoEn ? (
                    <span className="text-exito-600">
                      · ✓ enviado a la familia {fechaHoraAR(p.enviadoEn)}
                      {p.enviadoPor && ` por ${p.enviadoPor}`}
                    </span>
                  ) : (
                    <span className="text-alerta-600">· sin enviar todavía</span>
                  )}
                </p>
                <p className="whitespace-pre-line text-humo-800">
                  <span className="text-xs text-humo-400">Para la familia: </span>
                  {p.parteFamilia}
                </p>
                {p.notaClinica && (
                  <p className="whitespace-pre-line text-humo-600">
                    <span className="text-xs text-humo-400">Nota clínica: </span>
                    {p.notaClinica}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Hoja de medicación */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-humo-900">Hoja de medicación</h2>
          {activa && !med && (
            <button onClick={() => setMed({ medicamento: "", dosis: "", via: "", frecuencia: "8", indicaciones: "" })} className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium">
              + Indicar medicación
            </button>
          )}
        </div>
        {med && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(
                `/api/internaciones/${id}/medicaciones`,
                "POST",
                {
                  medicamento: med.medicamento,
                  dosis: med.dosis,
                  via: med.via,
                  frecuenciaHoras: med.frecuencia ? Number(med.frecuencia) : null,
                  indicaciones: med.indicaciones,
                },
                () => setMed(null)
              );
            }}
            className="flex flex-col gap-3 rounded-xl border border-humo-200 bg-white p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Medicamento">
                <input required autoFocus value={med.medicamento} onChange={(e) => setMed({ ...med, medicamento: e.target.value })} className={INPUT} />
              </Campo>
              <Campo etiqueta="Dosis">
                <input required value={med.dosis} onChange={(e) => setMed({ ...med, dosis: e.target.value })} placeholder="Ej: 250 mg, 1 comprimido, 5 ml" className={INPUT} />
              </Campo>
              <Campo etiqueta="Vía (opcional)">
                <input list="vias" value={med.via} onChange={(e) => setMed({ ...med, via: e.target.value })} className={INPUT} />
                <datalist id="vias">
                  <option value="Oral" />
                  <option value="Intravenosa (IV)" />
                  <option value="Subcutánea (SC)" />
                  <option value="Intramuscular (IM)" />
                  <option value="Tópica" />
                </datalist>
              </Campo>
              <Campo etiqueta="Frecuencia">
                <select value={med.frecuencia} onChange={(e) => setMed({ ...med, frecuencia: e.target.value })} className={INPUT}>
                  {FRECUENCIAS.map((f) => (
                    <option key={f.valor} value={f.valor}>
                      {f.texto}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <Campo etiqueta="Indicaciones (opcional)">
              <input value={med.indicaciones} onChange={(e) => setMed({ ...med, indicaciones: e.target.value })} placeholder="Ej: con comida, diluir en 10 ml" className={INPUT} />
            </Campo>
            <div className="flex gap-2">
              <button disabled={enviando} className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-60">
                Agregar a la hoja
              </button>
              <button type="button" onClick={() => setMed(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
                Cancelar
              </button>
            </div>
          </form>
        )}
        {i.medicaciones.length === 0 ? (
          <p className="text-sm text-humo-500">No hay medicación indicada.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {i.medicaciones.map((m) => {
              const estado = estadoToma(m, ahora);
              const abiertas = tomasAbiertas[m.id];
              return (
                <li key={m.id} className={`flex flex-col gap-2 rounded-xl border p-3 text-sm ${m.activa ? "border-humo-100 bg-white" : "border-humo-100 bg-humo-50"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className={`font-medium ${m.activa ? "text-humo-900" : "text-humo-400 line-through"}`}>
                        {m.medicamento} · {m.dosis}
                      </p>
                      <p className="text-xs text-humo-500">
                        {[m.via, FRECUENCIAS.find((f) => f.valor === String(m.frecuenciaHoras ?? ""))?.texto ?? `Cada ${m.frecuenciaHoras} horas`, m.indicaciones]
                          .filter(Boolean)
                          .join(" · ")}
                        {!m.activa && m.suspendidaEn && ` · suspendida ${fechaHoraAR(m.suspendidaEn)}`}
                      </p>
                    </div>
                    {estado && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estado.clase}`}>{estado.texto}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {m.activa && activa && (
                      <button
                        disabled={enviando}
                        onClick={() => enviar(`/api/medicaciones/${m.id}/tomas`, "POST", {}, () => {})}
                        className="btn-primary rounded-md px-3 py-1.5 text-xs disabled:opacity-60"
                      >
                        ✓ Di la toma ahora
                      </button>
                    )}
                    {m.tomas[0] && (
                      <span className="text-humo-500">
                        Última: {fechaHoraAR(m.tomas[0].administradaEn)} · {m.tomas[0].administradaPor}
                      </span>
                    )}
                    {m.tomas.length > 0 && (
                      <button onClick={() => setTomasAbiertas((t) => ({ ...t, [m.id]: !abiertas }))} className="text-[var(--color-primario)] hover:underline">
                        {abiertas ? "Ocultar tomas" : `Ver tomas (${m.tomas.length})`}
                      </button>
                    )}
                    {m.activa && activa && (
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Suspender ${m.medicamento}? Queda en la hoja como suspendida.`)) {
                            enviar(`/api/medicaciones/${m.id}`, "PATCH", null, () => {});
                          }
                        }}
                        className="ml-auto text-peligro-600 hover:underline"
                      >
                        Suspender
                      </button>
                    )}
                  </div>
                  {abiertas && (
                    <ul className="rounded-lg bg-humo-50 px-3 py-2 text-xs text-humo-600">
                      {m.tomas.map((t) => (
                        <li key={t.id}>
                          {fechaHoraAR(t.administradaEn)} · {t.administradaPor}
                          {t.observaciones && ` · ${t.observaciones}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Egreso */}
      {activa && (
        <section className="flex flex-col gap-2 rounded-xl border border-dashed border-humo-200 p-4">
          {!egreso ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setEgreso({ tipo: "ALTA", indicacionesAlta: "", notaEgreso: "" })} className="btn-primary rounded-lg px-4 py-2 text-sm">
                Dar el alta
              </button>
              <button onClick={() => setEgreso({ tipo: "DERIVADA", indicacionesAlta: "", notaEgreso: "" })} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
                Derivación
              </button>
              <button onClick={() => setEgreso({ tipo: "FALLECIDA", indicacionesAlta: "", notaEgreso: "" })} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
                Fallecimiento
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const texto = egreso.tipo === "ALTA" ? "dar el alta" : egreso.tipo === "DERIVADA" ? "registrar la derivación" : "registrar el fallecimiento";
                if (!window.confirm(`¿Confirmás ${texto}? La internación queda cerrada y se suspende la medicación.`)) return;
                enviar(`/api/internaciones/${id}/egreso`, "POST", egreso, () => setEgreso(null));
              }}
              className="flex flex-col gap-3"
            >
              <p className="font-medium text-humo-900">
                {egreso.tipo === "ALTA" ? "Alta" : egreso.tipo === "DERIVADA" ? "Derivación" : "Fallecimiento"}
              </p>
              {egreso.tipo === "ALTA" && (
                <Campo etiqueta="Indicaciones para la casa (se las manda la secretaria al tutor)">
                  <textarea
                    required
                    rows={4}
                    value={egreso.indicacionesAlta}
                    onChange={(e) => setEgreso({ ...egreso, indicacionesAlta: e.target.value })}
                    placeholder="Ej: Amoxicilina 250 mg cada 12 h por 5 días. Dieta blanda. Control el viernes."
                    className={INPUT}
                  />
                </Campo>
              )}
              <Campo etiqueta="Nota clínica de egreso (solo veterinario)">
                <textarea rows={3} value={egreso.notaEgreso} onChange={(e) => setEgreso({ ...egreso, notaEgreso: e.target.value })} className={INPUT} />
              </Campo>
              {egreso.tipo === "FALLECIDA" && (
                <p className="text-xs text-humo-500">La ficha de la mascota queda marcada como fallecida y deja de recibir recordatorios.</p>
              )}
              <div className="flex gap-2">
                <button disabled={enviando} className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-60">
                  Confirmar
                </button>
                <button type="button" onClick={() => setEgreso(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
