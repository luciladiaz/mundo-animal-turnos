"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ClienteListado {
  id: string;
  nombre: string;
  telefono: string;
  mascotas: { id: string; nombre: string; especie: string | null; alertas: string | null; fallecida: boolean }[];
  _count: { turnos: number };
}

const INPUT =
  "rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100";

export default function ClientesPanel() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState<ClienteListado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", telefono: "" });
  const [error, setError] = useState<string | null>(null);

  // Búsqueda con una pequeña espera, para no consultar en cada tecla.
  useEffect(() => {
    let cancelado = false;
    const t = setTimeout(async () => {
      setCargando(true);
      const res = await fetch(`/api/clientes?q=${encodeURIComponent(busqueda)}`);
      const data = await res.json();
      if (!cancelado) {
        setClientes(data.clientes ?? []);
        setCargando(false);
      }
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [busqueda]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.status === 409 && data.clienteId) {
      setError(data.error);
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el cliente");
      return;
    }
    router.push(`/admin/clientes/${data.cliente.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        autoFocus
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por cliente, teléfono o mascota..."
        className={`${INPUT} bg-white`}
      />

      {!mostrarForm ? (
        <button onClick={() => setMostrarForm(true)} className="btn-primary w-fit rounded-lg px-4 py-2 text-sm">
          + Nuevo cliente
        </button>
      ) : (
        <form onSubmit={crear} className="flex flex-col gap-3 rounded-xl border border-humo-200 bg-white p-4">
          {error && <div className="rounded-xl bg-peligro-50 px-4 py-2 text-sm text-peligro-600">{error}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-humo-600">Nombre y apellido</span>
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-humo-600">Teléfono</span>
              <input
                required
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className={INPUT}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm">
              Crear ficha
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarForm(false);
                setError(null);
              }}
              className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <p className="text-sm text-humo-500">Buscando...</p>
      ) : clientes.length === 0 ? (
        <p className="text-sm text-humo-500">
          {busqueda ? "No hay clientes que coincidan con la búsqueda." : "Todavía no hay clientes cargados."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {clientes.map((c) => (
            <Link
              key={c.id}
              href={`/admin/clientes/${c.id}`}
              className="card-suave flex flex-col gap-1 rounded-xl border border-humo-100 bg-white p-4 transition hover:border-mora-200"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-humo-900">{c.nombre}</p>
                <p className="text-xs text-humo-400">
                  {c._count.turnos === 1 ? "1 turno" : `${c._count.turnos} turnos`}
                </p>
              </div>
              <p className="text-sm tabular-nums text-humo-500">{c.telefono}</p>
              {c.mascotas.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.mascotas.map((m) => (
                    <span
                      key={m.id}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        m.fallecida ? "bg-humo-100 text-humo-400" : "bg-mora-50 text-mora-700"
                      }`}
                    >
                      {m.nombre}
                      {m.especie && ` · ${m.especie}`}
                      {m.alertas && !m.fallecida && " ⚠️"}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
