"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Turno, Servicio } from "@prisma/client";
import { getDiaSemana, getFechaHoyArgentina, sumarDias } from "@/lib/disponibilidad";
import NuevoTurnoModal from "@/components/NuevoTurnoModal";

type TurnoConServicio = Turno & { servicio: Servicio };
type Vista = "dia" | "semana" | "mes";

const NOMBRES_DIA_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const NOMBRES_DIA_LARGO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const NOMBRES_MES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// Colores semánticos de estado — independientes del acento de marca, así el estado
// de un turno se lee igual sin importar qué colores tenga cada cliente de Solvit Studio.
const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: "bg-alerta-50 text-alerta-600",
  CONFIRMADO: "bg-exito-50 text-exito-600",
  CANCELADO: "bg-humo-100 text-humo-400 line-through",
  COMPLETADO: "bg-celeste-50 text-celeste-600",
};

function diaDelMes(fecha: string): number {
  return Number(fecha.split("-")[2]);
}

function inicioSemana(fecha: string): string {
  const dia = getDiaSemana(fecha);
  const offset = dia === 0 ? 6 : dia - 1; // días desde el lunes
  return sumarDias(fecha, -offset);
}

function finSemana(fecha: string): string {
  const dia = getDiaSemana(fecha);
  const offset = dia === 0 ? 0 : 7 - dia;
  return sumarDias(fecha, offset);
}

function primerDiaMes(fecha: string): string {
  const [y, m] = fecha.split("-");
  return `${y}-${m}-01`;
}

function primerDiaMesSiguiente(fecha: string): string {
  const [y, m] = fecha.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

function primerDiaMesAnterior(fecha: string): string {
  const [y, m] = fecha.split("-").map(Number);
  const nm = m === 1 ? 12 : m - 1;
  const ny = m === 1 ? y - 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

function rangoFechas(desde: string, hasta: string): string[] {
  const fechas: string[] = [];
  let actual = desde;
  while (actual <= hasta) {
    fechas.push(actual);
    actual = sumarDias(actual, 1);
  }
  return fechas;
}

export default function TurnosPanel() {
  const hoy = useMemo(() => getFechaHoyArgentina(), []);
  const [vista, setVista] = useState<Vista>("semana");
  const [fechaRef, setFechaRef] = useState(hoy);
  const [turnos, setTurnos] = useState<TurnoConServicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reprogramando, setReprogramando] = useState<string | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaHora, setNuevaHora] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);

  const diasGrilla = useMemo(() => {
    if (vista === "dia") return [fechaRef];
    if (vista === "semana") {
      const inicio = inicioSemana(fechaRef);
      return rangoFechas(inicio, sumarDias(inicio, 6));
    }
    // mes: desde el lunes de la semana del día 1 hasta el domingo de la semana del último día
    const inicioGrid = inicioSemana(primerDiaMes(fechaRef));
    const finGrid = finSemana(sumarDias(primerDiaMesSiguiente(fechaRef), -1));
    return rangoFechas(inicioGrid, finGrid);
  }, [vista, fechaRef]);

  const cargarTurnos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const desde = diasGrilla[0];
      const hasta = diasGrilla[diasGrilla.length - 1];
      const res = await fetch(`/api/turnos?desde=${desde}&hasta=${hasta}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudieron cargar los turnos");
      setTurnos(data.turnos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado cargando turnos");
    } finally {
      setCargando(false);
    }
  }, [diasGrilla]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial/al cambiar de vista o rango, patrón estándar.
    cargarTurnos();
  }, [cargarTurnos]);

  const turnosPorDia = useMemo(() => {
    const mapa = new Map<string, TurnoConServicio[]>();
    for (const t of turnos) {
      const lista = mapa.get(t.fecha) ?? [];
      lista.push(t);
      mapa.set(t.fecha, lista);
    }
    for (const lista of mapa.values()) lista.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    return mapa;
  }, [turnos]);

  function navegar(direccion: -1 | 1) {
    if (vista === "dia") setFechaRef((f) => sumarDias(f, direccion));
    else if (vista === "semana") setFechaRef((f) => sumarDias(f, direccion * 7));
    else setFechaRef((f) => (direccion === 1 ? primerDiaMesSiguiente(f) : primerDiaMesAnterior(f)));
  }

  function irAHoy() {
    setFechaRef(hoy);
  }

  async function cambiarEstado(id: string, estado: "CONFIRMADO" | "CANCELADO" | "COMPLETADO") {
    setError(null);
    const res = await fetch(`/api/turnos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo actualizar el turno");
      return;
    }
    await cargarTurnos();
  }

  function abrirReprogramar(t: TurnoConServicio) {
    setReprogramando(t.id);
    setNuevaFecha(t.fecha);
    setNuevaHora(t.horaInicio);
    setError(null);
  }

  async function guardarReprogramacion(id: string) {
    setError(null);
    const res = await fetch(`/api/turnos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha: nuevaFecha, horaInicio: nuevaHora }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo reprogramar el turno");
      return;
    }
    setReprogramando(null);
    await cargarTurnos();
  }

  function tituloRango(): string {
    if (vista === "dia") {
      const [, m, d] = fechaRef.split("-").map(Number);
      return `${NOMBRES_DIA_LARGO[getDiaSemana(fechaRef)]} ${d} de ${NOMBRES_MES_LARGO[m - 1]}`;
    }
    if (vista === "semana") {
      const inicio = diasGrilla[0];
      const fin = diasGrilla[6];
      const [ya, ma, da] = inicio.split("-").map(Number);
      const [, mb, db] = fin.split("-").map(Number);
      return ma === mb
        ? `${da} – ${db} de ${NOMBRES_MES_LARGO[ma - 1]} ${ya}`
        : `${da} de ${NOMBRES_MES_LARGO[ma - 1]} – ${db} de ${NOMBRES_MES_LARGO[mb - 1]} ${ya}`;
    }
    const [y, m] = fechaRef.split("-").map(Number);
    return `${NOMBRES_MES_LARGO[m - 1]} ${y}`;
  }

  function TarjetaTurno({ t, compacta = false }: { t: TurnoConServicio; compacta?: boolean }) {
    if (compacta) {
      return (
        <div className={`rounded-md px-1.5 py-1 text-[11px] leading-tight tabular-nums ${ESTADO_BADGE[t.estado]}`}>
          <span className="font-medium">{t.horaInicio}</span> {t.mascotaNombre}
        </div>
      );
    }
    return (
      <div className="card-suave rounded-xl border border-humo-100 bg-white p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium text-humo-900">
              <span className="tabular-nums">
                {t.horaInicio}–{t.horaFin}
              </span>{" "}
              · {t.servicio.nombre}
            </p>
            <p className="text-sm text-humo-600">
              {t.mascotaNombre} ({t.clienteNombre}, {t.clienteTelefono})
            </p>
            {t.notas && <p className="text-xs text-humo-400">Notas: {t.notas}</p>}
          </div>
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${ESTADO_BADGE[t.estado]}`}>{t.estado}</span>
        </div>

        {(t.estado === "PENDIENTE" || t.estado === "CONFIRMADO") && (
          <div className="mt-2 flex flex-wrap gap-2">
            {t.estado === "PENDIENTE" && (
              <button
                onClick={() => cambiarEstado(t.id, "CONFIRMADO")}
                className="btn-primary rounded-md px-3 py-1.5 text-xs"
              >
                Confirmar
              </button>
            )}
            <button
              onClick={() => abrirReprogramar(t)}
              className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
            >
              Reprogramar
            </button>
            <button
              onClick={() => cambiarEstado(t.id, "COMPLETADO")}
              className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
            >
              Marcar completado
            </button>
            <button
              onClick={() => cambiarEstado(t.id, "CANCELADO")}
              className="btn-danger rounded-md px-3 py-1.5 text-xs font-medium"
            >
              Cancelar
            </button>
          </div>
        )}

        {reprogramando === t.id && (
          <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-humo-50 p-3">
            <label className="flex flex-col text-xs text-humo-500">
              Fecha
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                className="rounded border border-humo-200 px-2 py-1 text-sm"
              />
            </label>
            <label className="flex flex-col text-xs text-humo-500">
              Hora
              <input
                type="time"
                value={nuevaHora}
                onChange={(e) => setNuevaHora(e.target.value)}
                className="rounded border border-humo-200 px-2 py-1 text-sm"
              />
            </label>
            <button
              onClick={() => guardarReprogramacion(t.id)}
              className="btn-primary rounded-md px-3 py-1.5 text-xs"
            >
              Guardar
            </button>
            <button
              onClick={() => setReprogramando(null)}
              className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="rounded-xl bg-peligro-50 px-4 py-2 text-sm text-peligro-600">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navegar(-1)}
            className="btn-secondary rounded-md px-2.5 py-1.5 text-sm"
          >
            ←
          </button>
          <button
            onClick={irAHoy}
            className="btn-secondary rounded-md px-3 py-1.5 text-sm font-medium"
          >
            Hoy
          </button>
          <button
            onClick={() => navegar(1)}
            className="btn-secondary rounded-md px-2.5 py-1.5 text-sm"
          >
            →
          </button>
          <h2 className="ml-1 font-display text-base font-semibold capitalize text-humo-900">{tituloRango()}</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-humo-200 bg-white p-1">
            {(["dia", "semana", "mes"] as Vista[]).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`rounded-lg px-3.5 py-1.5 text-sm capitalize transition ${
                  vista === v ? "bg-[var(--color-primario)] text-white shadow-sm" : "text-humo-600 hover:bg-humo-50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => setModalAbierto(true)}
            className="btn-primary rounded-lg px-3 py-1.5 text-sm"
          >
            + Nuevo turno
          </button>
        </div>
      </div>

      {cargando && <p className="text-sm text-humo-500">Cargando turnos...</p>}

      {!cargando && vista === "dia" && (
        <div className="flex flex-col gap-2">
          {(turnosPorDia.get(fechaRef) ?? []).length === 0 && (
            <p className="text-sm text-humo-500">No hay turnos este día.</p>
          )}
          {(turnosPorDia.get(fechaRef) ?? []).map((t) => (
            <TarjetaTurno key={t.id} t={t} />
          ))}
        </div>
      )}

      {!cargando && vista === "semana" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[840px] grid-cols-7 gap-2">
            {diasGrilla.map((fecha) => {
              const esHoy = fecha === hoy;
              const lista = turnosPorDia.get(fecha) ?? [];
              return (
                <div key={fecha} className="card-suave flex flex-col gap-1.5 rounded-xl border border-humo-100 bg-humo-50/60 p-2">
                  <button
                    onClick={() => {
                      setFechaRef(fecha);
                      setVista("dia");
                    }}
                    className={`rounded-md px-1.5 py-1 text-left text-xs transition ${esHoy ? "bg-[var(--color-primario)] text-white" : "text-humo-500 hover:bg-humo-100"}`}
                  >
                    <span className="uppercase">{NOMBRES_DIA_CORTO[getDiaSemana(fecha)]}</span>{" "}
                    <span className="font-semibold tabular-nums">{diaDelMes(fecha)}</span>
                  </button>
                  <div className="flex flex-col gap-1">
                    {lista.length === 0 && <p className="px-1.5 text-[11px] text-humo-300">Sin turnos</p>}
                    {lista.map((t) => (
                      <TarjetaTurno key={t.id} t={t} compacta />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!cargando && vista === "mes" && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-humo-400">
            {NOMBRES_DIA_CORTO.map((n) => (
              <div key={n}>{n}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {diasGrilla.map((fecha) => {
              const esHoy = fecha === hoy;
              const esDelMes = fecha.slice(0, 7) === fechaRef.slice(0, 7);
              const lista = turnosPorDia.get(fecha) ?? [];
              return (
                <button
                  key={fecha}
                  onClick={() => {
                    setFechaRef(fecha);
                    setVista("dia");
                  }}
                  className={`flex min-h-[84px] flex-col gap-1 rounded-xl border p-1.5 text-left transition ${
                    esDelMes ? "border-humo-100 bg-white hover:border-[var(--color-primario)]/40" : "border-humo-50 bg-humo-50/40"
                  }`}
                >
                  <span
                    className={`w-fit rounded px-1 text-xs tabular-nums ${
                      esHoy
                        ? "bg-[var(--color-primario)] text-white"
                        : esDelMes
                          ? "text-humo-600"
                          : "text-humo-300"
                    }`}
                  >
                    {diaDelMes(fecha)}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {lista.slice(0, 2).map((t) => (
                      <div key={t.id} className={`truncate rounded px-1 text-[10px] tabular-nums ${ESTADO_BADGE[t.estado]}`}>
                        {t.horaInicio} {t.mascotaNombre}
                      </div>
                    ))}
                    {lista.length > 2 && <span className="px-1 text-[10px] text-humo-400">+{lista.length - 2} más</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {modalAbierto && (
        <NuevoTurnoModal
          fechaInicial={vista === "dia" ? fechaRef : hoy}
          onClose={() => setModalAbierto(false)}
          onCreated={cargarTurnos}
        />
      )}
    </div>
  );
}
