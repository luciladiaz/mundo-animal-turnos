"use client";

import { useCallback, useEffect, useState } from "react";
import { INPUT, MensajeError } from "@/components/ui/Campos";

interface Medio {
  id: string;
  nombre: string;
  activo: boolean;
  esEfectivo: boolean;
}

export default function MediosPagoPanel() {
  const [medios, setMedios] = useState<Medio[]>([]);
  const [nuevo, setNuevo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setMedios((await (await fetch("/api/medios-pago?todos=1")).json()).medios ?? []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar.
    cargar();
  }, [cargar]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/medios-pago", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: nuevo }) });
    if (!res.ok) return setError((await res.json()).error ?? "No se pudo agregar");
    setNuevo("");
    await cargar();
  }

  async function alternar(m: Medio) {
    setError(null);
    const res = await fetch(`/api/medios-pago/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !m.activo }) });
    if (!res.ok) return setError((await res.json()).error ?? "No se pudo cambiar");
    await cargar();
  }

  return (
    <div className="flex flex-col gap-3">
      <MensajeError error={error} />
      <ul className="flex flex-col divide-y divide-humo-100 rounded-xl border border-humo-100 bg-white text-sm">
        {medios.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-4 py-2.5">
            <span className={m.activo ? "text-humo-900" : "text-humo-400"}>
              {m.nombre}
              {!m.activo && " · desactivado"}
            </span>
            {!m.esEfectivo && (
              <button onClick={() => alternar(m)} className="btn-secondary rounded-md px-3 py-1 text-xs font-medium">
                {m.activo ? "Desactivar" : "Activar"}
              </button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={agregar} className="flex gap-2">
        <input required value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nuevo medio, ej: Cuenta DNI" className={`${INPUT} max-w-xs`} />
        <button className="btn-primary rounded-lg px-4 py-2 text-sm">Agregar</button>
      </form>
      <p className="text-xs text-humo-400">Los medios no se borran porque hay ventas y cierres que los usan: se desactivan.</p>
    </div>
  );
}
