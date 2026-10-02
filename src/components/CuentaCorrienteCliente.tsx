"use client";

import { useCallback, useEffect, useState } from "react";
import { formatearPesos } from "@/lib/plata";
import { INPUT_CHICO, InputPlata, MensajeError, aCentavos, centavosATexto } from "@/components/ui/Campos";

interface VentaCC {
  id: string;
  numero: number;
  createdAt: string;
  total: number;
  pagado: number;
  estado: "ACTIVA" | "ANULADA";
  items: { descripcion: string; cantidad: number }[];
}
interface PagoCC {
  id: string;
  monto: number;
  usuario: string;
  createdAt: string;
  medioPago: { nombre: string };
}
interface Medio {
  id: string;
  nombre: string;
}

const fecha = (f: string) => new Date(f).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });

/** Saldo, historial y cobro de la cuenta corriente del cliente (permiso "ventas"). */
export default function CuentaCorrienteCliente({ tutorId }: { tutorId: string }) {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [ventas, setVentas] = useState<VentaCC[]>([]);
  const [pagos, setPagos] = useState<PagoCC[]>([]);
  const [medios, setMedios] = useState<Medio[]>([]);
  const [cobro, setCobro] = useState<{ medioPagoId: string; monto: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verHistorial, setVerHistorial] = useState(false);

  const cargar = useCallback(async () => {
    const data = await (await fetch(`/api/clientes/${tutorId}/cuenta-corriente`)).json();
    setSaldo(data.saldo ?? 0);
    setVentas(data.ventas ?? []);
    setPagos(data.pagos ?? []);
  }, [tutorId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar.
    cargar();
    (async () => setMedios((await (await fetch("/api/medios-pago")).json()).medios ?? []))();
  }, [cargar]);

  async function cobrar(e: React.FormEvent) {
    e.preventDefault();
    if (!cobro) return;
    const monto = aCentavos(cobro.monto);
    if (monto == null || monto <= 0) return setError("Revisá el monto");
    setError(null);
    const res = await fetch(`/api/clientes/${tutorId}/cuenta-corriente`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ medioPagoId: cobro.medioPagoId, monto }),
    });
    if (!res.ok) return setError((await res.json()).error ?? "No se pudo registrar el cobro");
    setCobro(null);
    await cargar();
  }

  if (saldo === null) return null;
  const compras = ventas.filter((v) => v.estado === "ACTIVA");
  if (compras.length === 0 && pagos.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-humo-900">Compras y cuenta corriente</h2>
        <span className={`rounded-full px-3 py-1 text-sm font-medium tabular-nums ${saldo > 0 ? "bg-alerta-50 text-alerta-600" : "bg-exito-50 text-exito-600"}`}>
          {saldo > 0 ? `Debe ${formatearPesos(saldo)}` : saldo < 0 ? `Saldo a favor ${formatearPesos(-saldo)}` : "Al día"}
        </span>
      </div>
      <MensajeError error={error} />
      {saldo > 0 &&
        (cobro ? (
          <form onSubmit={cobrar} className="flex flex-wrap items-center gap-2 rounded-xl border border-humo-200 bg-white p-3">
            <select value={cobro.medioPagoId} onChange={(e) => setCobro({ ...cobro, medioPagoId: e.target.value })} className={`${INPUT_CHICO} w-44`}>
              {medios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <div className="w-40">
              <InputPlata texto={cobro.monto} onChange={(t) => setCobro({ ...cobro, monto: t })} autoFocus />
            </div>
            <button className="btn-primary rounded-lg px-4 py-2 text-sm">Registrar cobro</button>
            <button type="button" onClick={() => setCobro(null)} className="text-sm text-humo-500">
              Cancelar
            </button>
            <p className="w-full text-xs text-humo-400">El cobro entra en la caja abierta de hoy.</p>
          </form>
        ) : (
          <button
            onClick={() => setCobro({ medioPagoId: medios[0]?.id ?? "", monto: centavosATexto(saldo) })}
            className="btn-secondary w-fit rounded-md px-3 py-1.5 text-xs font-medium"
          >
            Cobrar deuda
          </button>
        ))}
      <button onClick={() => setVerHistorial(!verHistorial)} className="w-fit text-xs font-medium text-[var(--color-primario)] hover:underline">
        {verHistorial ? "Ocultar compras y pagos" : `Ver compras y pagos (${compras.length + pagos.length})`}
      </button>
      {verHistorial && (
        <ul className="flex flex-col divide-y divide-humo-100 rounded-xl border border-humo-100 bg-white text-sm">
          {[
            ...compras.map((v) => ({
              id: v.id,
              cuando: v.createdAt,
              texto: `Compra N° ${v.numero}: ${v.items.map((i) => `${i.cantidad} × ${i.descripcion}`).join(", ")}`,
              detalle: v.total > v.pagado ? `${formatearPesos(v.total)} · quedó debiendo ${formatearPesos(v.total - v.pagado)}` : formatearPesos(v.total),
              debe: v.total > v.pagado,
            })),
            ...pagos.map((p) => ({
              id: p.id,
              cuando: p.createdAt,
              texto: `Pago de cuenta corriente (${p.medioPago.nombre}) · ${p.usuario}`,
              detalle: formatearPesos(p.monto),
              debe: false,
            })),
          ]
            .sort((a, b) => b.cuando.localeCompare(a.cuando))
            .map((m) => (
              <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2">
                <span>
                  <span className="tabular-nums text-humo-500">{fecha(m.cuando)}</span> · {m.texto}
                </span>
                <span className={`tabular-nums ${m.debe ? "text-alerta-600" : "text-humo-700"}`}>{m.detalle}</span>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
