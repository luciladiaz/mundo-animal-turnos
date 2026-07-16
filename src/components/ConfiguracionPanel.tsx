"use client";

import { useEffect, useState, useCallback } from "react";
import type { ConfiguracionNegocio, HorarioBloque } from "@prisma/client";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface BloqueForm {
  horaInicio: string;
  horaFin: string;
}

export default function ConfiguracionPanel() {
  const [config, setConfig] = useState<ConfiguracionNegocio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [linkPublico, setLinkPublico] = useState("");
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    direccion: "",
    telefono: "",
    colorPrimario: "#7b2d8e",
    colorSecundario: "#1c8fc7",
    bufferMinutos: "10",
  });

  const [bloquesPorDia, setBloquesPorDia] = useState<BloqueForm[][]>(
    Array.from({ length: 7 }, () => [])
  );

  const cargarTodo = useCallback(async () => {
    setCargando(true);
    const [resConfig, resHorarios] = await Promise.all([
      fetch("/api/configuracion"),
      fetch("/api/horarios"),
    ]);
    const dataConfig = await resConfig.json();
    const dataHorarios = await resHorarios.json();

    const c: ConfiguracionNegocio | null = dataConfig.configuracion;
    setConfig(c);
    if (c) {
      setForm({
        nombre: c.nombre ?? "",
        direccion: c.direccion ?? "",
        telefono: c.telefono ?? "",
        colorPrimario: c.colorPrimario,
        colorSecundario: c.colorSecundario,
        bufferMinutos: String(c.bufferMinutos),
      });
    }

    const porDia: BloqueForm[][] = Array.from({ length: 7 }, () => []);
    (dataHorarios.bloques as HorarioBloque[]).forEach((b) => {
      porDia[b.diaSemana].push({ horaInicio: b.horaInicio, horaFin: b.horaFin });
    });
    setBloquesPorDia(porDia);
    setCargando(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar.
    cargarTodo();
    setLinkPublico(window.location.origin);
  }, [cargarTodo]);

  async function guardarConfig(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    setOk(null);
    const res = await fetch("/api/configuracion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        bufferMinutos: Number(form.bufferMinutos),
      }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar");
      return;
    }
    setConfig(data.configuracion);
    setOk("Guardado.");
  }

  async function subirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("logo", file);
    setError(null);
    setSubiendoLogo(true);
    try {
      const res = await fetch("/api/upload-logo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir el logo");
        return;
      }
      setConfig(data.configuracion);
    } finally {
      setSubiendoLogo(false);
      e.target.value = "";
    }
  }

  function agregarBloque(dia: number) {
    setBloquesPorDia((prev) => {
      const copia = prev.map((arr) => [...arr]);
      copia[dia].push({ horaInicio: "09:00", horaFin: "13:00" });
      return copia;
    });
  }

  function quitarBloque(dia: number, idx: number) {
    setBloquesPorDia((prev) => {
      const copia = prev.map((arr) => [...arr]);
      copia[dia].splice(idx, 1);
      return copia;
    });
  }

  function actualizarBloque(dia: number, idx: number, campo: keyof BloqueForm, valor: string) {
    setBloquesPorDia((prev) => {
      const copia = prev.map((arr) => [...arr]);
      copia[dia][idx] = { ...copia[dia][idx], [campo]: valor };
      return copia;
    });
  }

  async function guardarHorarios() {
    setError(null);
    setOk(null);
    const bloques = bloquesPorDia.flatMap((arr, diaSemana) =>
      arr.map((b) => ({ diaSemana, ...b }))
    );
    const res = await fetch("/api/horarios", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bloques }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudieron guardar los horarios");
      return;
    }
    setOk("Horarios guardados.");
  }

  if (cargando) return <p className="text-sm text-humo-500">Cargando configuración...</p>;

  return (
    <div className="flex flex-col gap-8">
      {error && <div className="rounded-xl bg-peligro-50 px-4 py-2 text-sm text-peligro-600">{error}</div>}
      {ok && <div className="rounded-xl bg-exito-50 px-4 py-2 text-sm text-exito-600">{ok}</div>}

      <section className="card-suave rounded-xl border border-humo-200 bg-white p-4">
        <h2 className="mb-3 font-display font-semibold text-humo-900">Link público para compartir</h2>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={linkPublico}
            className="flex-1 rounded-lg border border-humo-200 bg-humo-50 px-3 py-2 text-sm text-humo-600"
          />
          <button
            onClick={() => navigator.clipboard.writeText(linkPublico)}
            className="btn-primary rounded-lg px-4 py-2 text-sm"
          >
            Copiar
          </button>
        </div>
      </section>

      <section className="card-suave rounded-xl border border-humo-200 bg-white p-4">
        <h2 className="mb-3 font-display font-semibold text-humo-900">Logo</h2>
        <div className="flex items-center gap-4">
          {config?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logoUrl} alt="Logo actual" className="h-16 w-16 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-mora-50 font-display text-xl font-semibold text-[var(--color-primario)]">
              {(config?.nombre ?? "M").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="btn-secondary w-fit cursor-pointer rounded-lg px-4 py-2 text-sm font-medium">
              {subiendoLogo ? "Subiendo..." : config?.logoUrl ? "Cambiar logo" : "Subir logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={subirLogo}
                disabled={subiendoLogo}
                className="hidden"
              />
            </label>
            <p className="text-xs text-humo-400">PNG, JPG, WEBP o SVG. Máximo 3MB.</p>
          </div>
        </div>
      </section>

      <form onSubmit={guardarConfig} className="card-suave rounded-xl border border-humo-200 bg-white p-4">
        <h2 className="mb-3 font-display font-semibold text-humo-900">Datos del negocio</h2>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-humo-600">Nombre</span>
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-humo-600">Dirección</span>
            <input
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-humo-600">Teléfono</span>
            <input
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-humo-600">Color primario</span>
              <input
                type="color"
                value={form.colorPrimario}
                onChange={(e) => setForm({ ...form, colorPrimario: e.target.value })}
                className="h-10 w-full rounded-lg border border-humo-200"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-humo-600">Color secundario</span>
              <input
                type="color"
                value={form.colorSecundario}
                onChange={(e) => setForm({ ...form, colorSecundario: e.target.value })}
                className="h-10 w-full rounded-lg border border-humo-200"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-humo-600">Buffer entre turnos (minutos)</span>
            <input
              type="number"
              min={0}
              step={5}
              value={form.bufferMinutos}
              onChange={(e) => setForm({ ...form, bufferMinutos: e.target.value })}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
            />
          </label>
          <button
            type="submit"
            disabled={guardando}
            className="btn-primary mt-2 w-fit rounded-lg px-4 py-2 text-sm"
          >
            {guardando ? "Guardando..." : "Guardar datos"}
          </button>
        </div>
      </form>

      <section className="card-suave rounded-xl border border-humo-200 bg-white p-4">
        <h2 className="mb-3 font-display font-semibold text-humo-900">Horarios de atención</h2>
        <div className="flex flex-col gap-4">
          {DIAS.map((nombreDia, dia) => (
            <div key={dia}>
              <p className="mb-1 text-sm font-medium text-humo-700">{nombreDia}</p>
              <div className="flex flex-col gap-2">
                {bloquesPorDia[dia].length === 0 && (
                  <p className="text-xs text-humo-400">Cerrado</p>
                )}
                {bloquesPorDia[dia].map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={b.horaInicio}
                      onChange={(e) => actualizarBloque(dia, idx, "horaInicio", e.target.value)}
                      className="rounded-lg border border-humo-200 px-2 py-1 text-sm"
                    />
                    <span className="text-humo-400">–</span>
                    <input
                      type="time"
                      value={b.horaFin}
                      onChange={(e) => actualizarBloque(dia, idx, "horaFin", e.target.value)}
                      className="rounded-lg border border-humo-200 px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => quitarBloque(dia, idx)}
                      className="text-xs text-peligro-500 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => agregarBloque(dia)}
                  className="w-fit text-xs text-humo-500 hover:underline"
                >
                  + Agregar bloque
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={guardarHorarios}
            className="btn-primary mt-2 w-fit rounded-lg px-4 py-2 text-sm"
          >
            Guardar horarios
          </button>
        </div>
      </section>
    </div>
  );
}
