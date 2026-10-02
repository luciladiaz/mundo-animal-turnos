"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HistorialTurnos, { type TurnoHistorial } from "@/components/HistorialTurnos";
import CuentaCorrienteCliente from "@/components/CuentaCorrienteCliente";
import { calcularEdad, linkWhatsApp } from "@/lib/formatoFichas";
import { getFechaHoyArgentina } from "@/lib/disponibilidad";

interface MascotaResumen {
  id: string;
  nombre: string;
  especie: string | null;
  raza: string | null;
  sexo: string | null;
  fechaNacimiento: string | null;
  alertas: string | null;
  fallecida: boolean;
}

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  dni: string | null;
  direccion: string | null;
  notas: string | null;
  aceptaRecordatorios: boolean;
  aceptaRecordatoriosFecha: string | null;
  mascotas: MascotaResumen[];
  turnos: TurnoHistorial[];
}

const INPUT =
  "rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100";

function formDesde(c: Cliente) {
  return {
    nombre: c.nombre,
    telefono: c.telefono,
    email: c.email ?? "",
    dni: c.dni ?? "",
    direccion: c.direccion ?? "",
    notas: c.notas ?? "",
    aceptaRecordatorios: c.aceptaRecordatorios,
  };
}

export default function FichaCliente({ id, puedeVender = false }: { id: string; puedeVender?: boolean }) {
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<ReturnType<typeof formDesde> | null>(null);
  const [nuevaMascota, setNuevaMascota] = useState<{ nombre: string; especie: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/clientes/${id}`);
    if (!res.ok) {
      setNoEncontrado(true);
      return;
    }
    const data = await res.json();
    setCliente(data.cliente);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar.
    cargar();
  }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    const res = await fetch(`/api/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar");
      return;
    }
    setEditando(false);
    await cargar();
  }

  async function agregarMascota(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaMascota) return;
    setError(null);
    const res = await fetch("/api/mascotas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tutorId: id, nombre: nuevaMascota.nombre, especie: nuevaMascota.especie }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo agregar la mascota");
      return;
    }
    router.push(`/admin/mascotas/${data.mascota.id}`);
  }

  if (noEncontrado) return <p className="text-sm text-humo-500">No se encontró este cliente.</p>;
  if (!cliente) return <p className="text-sm text-humo-500">Cargando ficha...</p>;

  const hoy = getFechaHoyArgentina();
  const whatsapp = linkWhatsApp(cliente.telefono);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/clientes" className="w-fit text-sm text-humo-500 hover:text-humo-800">
        ← Clientes
      </Link>

      {error && <div className="rounded-xl bg-peligro-50 px-4 py-2 text-sm text-peligro-600">{error}</div>}

      {/* Datos del tutor */}
      {!editando || !form ? (
        <section className="card-suave flex flex-col gap-2 rounded-xl border border-humo-100 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="font-display text-xl font-semibold text-humo-900">{cliente.nombre}</h1>
              <p className="text-sm tabular-nums text-humo-600">{cliente.telefono}</p>
            </div>
            <div className="flex gap-2">
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
                >
                  WhatsApp
                </a>
              )}
              <button
                onClick={() => {
                  setForm(formDesde(cliente));
                  setEditando(true);
                  setError(null);
                }}
                className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
              >
                Editar datos
              </button>
            </div>
          </div>
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            {cliente.email && <Dato etiqueta="Email" valor={cliente.email} />}
            {cliente.dni && <Dato etiqueta="DNI" valor={cliente.dni} />}
            {cliente.direccion && <Dato etiqueta="Dirección" valor={cliente.direccion} />}
            <Dato
              etiqueta="Recordatorios por WhatsApp"
              valor={
                cliente.aceptaRecordatorios
                  ? `Acepta${cliente.aceptaRecordatoriosFecha ? ` (desde el ${new Date(cliente.aceptaRecordatoriosFecha).toLocaleDateString("es-AR")})` : ""}`
                  : "No dio su permiso"
              }
            />
          </dl>
          {cliente.notas && <p className="whitespace-pre-line text-sm text-humo-600">{cliente.notas}</p>}
        </section>
      ) : (
        <form onSubmit={guardar} className="flex flex-col gap-3 rounded-xl border border-humo-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Nombre y apellido">
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={INPUT} />
            </Campo>
            <Campo etiqueta="Teléfono">
              <input required type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className={INPUT} />
            </Campo>
            <Campo etiqueta="Email (opcional)">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={INPUT} />
            </Campo>
            <Campo etiqueta="DNI (opcional)">
              <input value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} className={INPUT} />
            </Campo>
          </div>
          <Campo etiqueta="Dirección (opcional)">
            <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className={INPUT} />
          </Campo>
          <Campo etiqueta="Notas (opcional)">
            <textarea rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className={INPUT} />
          </Campo>
          <label className="flex items-start gap-2 text-sm text-humo-700">
            <input
              type="checkbox"
              checked={form.aceptaRecordatorios}
              onChange={(e) => setForm({ ...form, aceptaRecordatorios: e.target.checked })}
              className="mt-0.5"
            />
            <span>
              Acepta recibir recordatorios por WhatsApp (vacunas, controles).
              <span className="block text-xs text-humo-400">Marcalo solo si el cliente lo autorizó; se guarda la fecha.</span>
            </span>
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm">
              Guardar
            </button>
            <button type="button" onClick={() => setEditando(false)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Mascotas */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-humo-900">Mascotas</h2>
          {!nuevaMascota && (
            <button
              onClick={() => setNuevaMascota({ nombre: "", especie: "" })}
              className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
            >
              + Agregar mascota
            </button>
          )}
        </div>

        {nuevaMascota && (
          <form onSubmit={agregarMascota} className="flex flex-col gap-3 rounded-xl border border-humo-200 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Nombre">
                <input
                  required
                  value={nuevaMascota.nombre}
                  onChange={(e) => setNuevaMascota({ ...nuevaMascota, nombre: e.target.value })}
                  className={INPUT}
                />
              </Campo>
              <Campo etiqueta="Especie">
                <select
                  value={nuevaMascota.especie}
                  onChange={(e) => setNuevaMascota({ ...nuevaMascota, especie: e.target.value })}
                  className={`${INPUT} bg-white`}
                >
                  <option value="">Sin especificar</option>
                  <option value="Perro">Perro</option>
                  <option value="Gato">Gato</option>
                  <option value="Otro">Otro</option>
                </select>
              </Campo>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm">
                Agregar
              </button>
              <button type="button" onClick={() => setNuevaMascota(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {cliente.mascotas.length === 0 ? (
          <p className="text-sm text-humo-500">Todavía no tiene mascotas cargadas.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {cliente.mascotas.map((m) => {
              const edad = m.fechaNacimiento && !m.fallecida ? calcularEdad(m.fechaNacimiento, hoy) : null;
              return (
                <Link
                  key={m.id}
                  href={`/admin/mascotas/${m.id}`}
                  className={`card-suave flex flex-col gap-1 rounded-xl border p-4 transition hover:border-mora-200 ${
                    m.fallecida ? "border-humo-100 bg-humo-50" : "border-humo-100 bg-white"
                  }`}
                >
                  <p className={`font-medium ${m.fallecida ? "text-humo-400" : "text-humo-900"}`}>
                    {m.nombre}
                    {m.fallecida && <span className="text-xs font-normal"> · falleció</span>}
                  </p>
                  <p className="text-sm text-humo-500">
                    {[m.especie, m.raza, m.sexo, edad].filter(Boolean).join(" · ") || "Sin datos de reseña"}
                  </p>
                  {m.alertas && !m.fallecida && (
                    <p className="rounded-md bg-peligro-50 px-2 py-1 text-xs text-peligro-600">⚠️ {m.alertas}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {puedeVender && <CuentaCorrienteCliente tutorId={cliente.id} />}

      {/* Turnos */}
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-humo-900">Turnos</h2>
        <HistorialTurnos turnos={cliente.turnos} mostrarMascota />
      </section>
    </div>
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

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-humo-400">{etiqueta}</dt>
      <dd className="text-humo-700">{valor}</dd>
    </div>
  );
}

