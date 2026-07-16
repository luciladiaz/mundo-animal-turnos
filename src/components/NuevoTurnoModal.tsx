"use client";

import { useEffect, useState } from "react";
import type { Servicio } from "@prisma/client";

interface Props {
  fechaInicial: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function NuevoTurnoModal({ fechaInicial, onClose, onCreated }: Props) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioId, setServicioId] = useState("");
  const [fecha, setFecha] = useState(fechaInicial);
  const [horaInicio, setHoraInicio] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [cargandoSlots, setCargandoSlots] = useState(false);

  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [mascotaNombre, setMascotaNombre] = useState("");
  const [mascotaEspecie, setMascotaEspecie] = useState("");
  const [notas, setNotas] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/servicios")
      .then((res) => res.json())
      .then((data) => {
        setServicios(data.servicios ?? []);
        if (data.servicios?.[0]) setServicioId(data.servicios[0].id);
      })
      .catch(() => setError("No se pudieron cargar los servicios"));
  }, []);

  useEffect(() => {
    if (!servicioId || !fecha) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga de horarios libres al cambiar servicio/fecha, patrón estándar.
      setSlots([]);
      return;
    }
    setCargandoSlots(true);
    fetch(`/api/disponibilidad?servicioId=${servicioId}&fecha=${fecha}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setCargandoSlots(false));
  }, [servicioId, fecha]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!servicioId || !fecha || !horaInicio) {
      setError("Completá servicio, fecha y hora");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicioId,
          fecha,
          horaInicio,
          clienteNombre,
          clienteTelefono,
          clienteEmail: clienteEmail || undefined,
          mascotaNombre,
          mascotaEspecie: mascotaEspecie || undefined,
          notas: notas || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el turno");
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError("Error inesperado, intentá de nuevo");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
      <form
        onSubmit={crear}
        className="my-8 flex w-full max-w-md flex-col gap-3 rounded-xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-humo-900">Cargar turno manual</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-humo-400 hover:bg-humo-100 hover:text-humo-600"
          >
            ✕
          </button>
        </div>

        {error && <div className="rounded-lg bg-peligro-50 px-3 py-2 text-sm text-peligro-600">{error}</div>}

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-humo-600">Servicio</span>
          <select
            value={servicioId}
            onChange={(e) => setServicioId(e.target.value)}
            className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
          >
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} ({s.duracionMinutos} min)
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-humo-600">Fecha</span>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-humo-600">Hora</span>
            <input
              type="time"
              required
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-humo-500">
            {cargandoSlots
              ? "Buscando horarios libres..."
              : slots.length > 0
                ? "Horarios libres (click para completar):"
                : "No hay horarios libres sugeridos para ese día — igual podés cargar uno manual."}
          </span>
          {slots.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {slots.map((hora) => (
                <button
                  key={hora}
                  type="button"
                  onClick={() => setHoraInicio(hora)}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    horaInicio === hora
                      ? "border-[var(--color-primario)] bg-[var(--color-primario)] text-white"
                      : "border-humo-200 text-humo-600 hover:border-[var(--color-primario)]"
                  }`}
                >
                  {hora}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-humo-600">Nombre del dueño</span>
          <input
            required
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
          />
        </label>

        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-humo-600">Teléfono</span>
            <input
              required
              value={clienteTelefono}
              onChange={(e) => setClienteTelefono(e.target.value)}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-humo-600">Email (opcional)</span>
            <input
              type="email"
              value={clienteEmail}
              onChange={(e) => setClienteEmail(e.target.value)}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-humo-600">Nombre de la mascota</span>
            <input
              required
              value={mascotaNombre}
              onChange={(e) => setMascotaNombre(e.target.value)}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-humo-600">Especie (opcional)</span>
            <input
              value={mascotaEspecie}
              onChange={(e) => setMascotaEspecie(e.target.value)}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-humo-600">Notas (opcional)</span>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
          />
        </label>

        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            disabled={enviando}
            className="btn-primary flex-1 rounded-lg px-4 py-2.5 text-sm"
          >
            {enviando ? "Guardando..." : "Guardar turno"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary rounded-lg px-4 py-2.5 text-sm font-medium"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
