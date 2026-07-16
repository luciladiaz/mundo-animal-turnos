"use client";

import { useEffect, useState, useCallback } from "react";
import type { Servicio } from "@prisma/client";

interface FormServicio {
  nombre: string;
  descripcion: string;
  duracionMinutos: string;
  precio: string;
}

const FORM_VACIO: FormServicio = { nombre: "", descripcion: "", duracionMinutos: "30", precio: "" };

export default function ServiciosPanel() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormServicio>(FORM_VACIO);

  const cargarServicios = useCallback(async () => {
    setCargando(true);
    const res = await fetch("/api/servicios?todos=1");
    const data = await res.json();
    setServicios(data.servicios ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar.
    cargarServicios();
  }, [cargarServicios]);

  function abrirNuevo() {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setMostrarForm(true);
    setError(null);
  }

  function abrirEditar(s: Servicio) {
    setEditandoId(s.id);
    setForm({
      nombre: s.nombre,
      descripcion: s.descripcion ?? "",
      duracionMinutos: String(s.duracionMinutos),
      precio: s.precio != null ? String(s.precio) : "",
    });
    setMostrarForm(true);
    setError(null);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || undefined,
      duracionMinutos: Number(form.duracionMinutos),
      precio: form.precio ? Number(form.precio) : null,
    };

    const res = await fetch(editandoId ? `/api/servicios/${editandoId}` : "/api/servicios", {
      method: editandoId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar el servicio");
      return;
    }
    setMostrarForm(false);
    await cargarServicios();
  }

  async function toggleActivo(s: Servicio) {
    const res = await fetch(`/api/servicios/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !s.activo }),
    });
    if (res.ok) await cargarServicios();
  }

  if (cargando) return <p className="text-sm text-humo-500">Cargando servicios...</p>;

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="rounded-xl bg-peligro-50 px-4 py-2 text-sm text-peligro-600">{error}</div>}

      {!mostrarForm && (
        <button
          onClick={abrirNuevo}
          className="btn-primary w-fit rounded-lg px-4 py-2 text-sm"
        >
          + Nuevo servicio
        </button>
      )}

      {mostrarForm && (
        <form onSubmit={guardar} className="flex flex-col gap-3 rounded-xl border border-humo-200 bg-white p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-humo-600">Nombre</span>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-humo-600">Descripción (opcional)</span>
            <input
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-humo-600">Duración (minutos)</span>
              <input
                required
                type="number"
                min={5}
                step={5}
                value={form.duracionMinutos}
                onChange={(e) => setForm({ ...form, duracionMinutos: e.target.value })}
                className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-humo-600">Precio (opcional)</span>
              <input
                type="number"
                min={0}
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
                className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-primary rounded-lg px-4 py-2 text-sm"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {servicios.map((s) => (
          <div
            key={s.id}
            className={`card-suave flex items-center justify-between rounded-xl border p-4 ${
              s.activo ? "border-humo-100 bg-white" : "border-humo-100 bg-humo-50"
            }`}
          >
            <div>
              <p className={`font-medium ${s.activo ? "text-humo-900" : "text-humo-400"}`}>{s.nombre}</p>
              <p className="text-sm tabular-nums text-humo-500">
                {s.duracionMinutos} min
                {s.precio != null ? ` · $${s.precio.toLocaleString("es-AR")}` : ""}
                {!s.activo && " · inactivo"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => abrirEditar(s)}
                className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
              >
                Editar
              </button>
              <button
                onClick={() => toggleActivo(s)}
                className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
              >
                {s.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
