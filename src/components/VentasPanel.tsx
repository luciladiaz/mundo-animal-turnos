"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatearPesos } from "@/lib/plata";
import { Campo, INPUT, InputPlata, MensajeError, aCentavos } from "@/components/ui/Campos";

interface Resumen {
  medioPagoId: string;
  nombre: string;
  esEfectivo: boolean;
  esperado: number;
}
interface Caja {
  id: string;
  abiertaEn: string;
  abiertaPor: string;
  efectivoInicial: number;
}
interface MovimientoManual {
  id: string;
  tipo: "GASTO" | "INGRESO" | "RETIRO" | "COBRO_CUENTA_CORRIENTE";
  monto: number;
  descripcion: string | null;
  usuario: string;
  createdAt: string;
  medioPago: { nombre: string };
  pagoCuentaCorriente: { tutor: { id: string; nombre: string } } | null;
}
interface Venta {
  id: string;
  numero: number;
  createdAt: string;
  total: number;
  pagado: number;
  estado: "ACTIVA" | "ANULADA";
  motivoAnulacion: string | null;
  anuladaPor: string | null;
  usuario: string;
  observaciones: string | null;
  tutor: { id: string; nombre: string } | null;
  items: { id: string; descripcion: string; cantidad: number; precioLista: number; precioUnitario: number; subtotal: number }[];
  pagos: { id: string; monto: number; medioPago: { nombre: string } }[];
}
interface Medio {
  id: string;
  nombre: string;
}

const TIPO_MOV: Record<MovimientoManual["tipo"], string> = {
  GASTO: "Gasto",
  INGRESO: "Ingreso",
  RETIRO: "Retiro",
  COBRO_CUENTA_CORRIENTE: "Cobro de cuenta corriente",
};

function hora(fecha: string) {
  return new Date(fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
}

export default function VentasPanel({ puedeAnular, puedeConfigurar }: { puedeAnular: boolean; puedeConfigurar: boolean }) {
  const aviso = useSearchParams().get("ok");
  const [cargando, setCargando] = useState(true);
  const [caja, setCaja] = useState<Caja | null>(null);
  const [resumen, setResumen] = useState<Resumen[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoManual[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [medios, setMedios] = useState<Medio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inicial, setInicial] = useState("");
  const [movForm, setMovForm] = useState<{ tipo: "GASTO" | "INGRESO" | "RETIRO"; medioPagoId: string; monto: string; descripcion: string } | null>(null);
  const [anulando, setAnulando] = useState<{ id: string; numero: number; motivo: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const [rCaja, rVentas, rMedios] = await Promise.all([fetch("/api/caja"), fetch("/api/ventas"), fetch("/api/medios-pago")]);
    const dCaja = await rCaja.json();
    setCaja(dCaja.caja ?? null);
    setResumen(dCaja.resumen ?? []);
    setMovimientos(dCaja.movimientos ?? []);
    setVentas((await rVentas.json()).ventas ?? []);
    setMedios((await rMedios.json()).medios ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar.
    cargar();
  }, [cargar]);

  async function abrir(e: React.FormEvent) {
    e.preventDefault();
    const monto = aCentavos(inicial || "0");
    if (monto == null || monto < 0) return setError("Revisá el efectivo inicial");
    setError(null);
    setEnviando(true);
    const res = await fetch("/api/caja", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ efectivoInicial: monto }) });
    setEnviando(false);
    if (!res.ok) return setError((await res.json()).error ?? "No se pudo abrir la caja");
    setInicial("");
    await cargar();
  }

  async function guardarMovimiento(e: React.FormEvent) {
    e.preventDefault();
    if (!movForm) return;
    const monto = aCentavos(movForm.monto);
    if (monto == null || monto <= 0) return setError("Revisá el monto");
    setError(null);
    setEnviando(true);
    const res = await fetch("/api/caja/movimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...movForm, monto }),
    });
    setEnviando(false);
    if (!res.ok) return setError((await res.json()).error ?? "No se pudo registrar");
    setMovForm(null);
    await cargar();
  }

  async function confirmarAnulacion(e: React.FormEvent) {
    e.preventDefault();
    if (!anulando) return;
    setError(null);
    setEnviando(true);
    const res = await fetch(`/api/ventas/${anulando.id}/anular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo: anulando.motivo }),
    });
    setEnviando(false);
    if (!res.ok) return setError((await res.json()).error ?? "No se pudo anular");
    setAnulando(null);
    await cargar();
  }

  if (cargando) return <p className="text-sm text-humo-500">Cargando caja...</p>;

  const links = (
    <div className="flex flex-wrap gap-3 text-sm">
      <Link href="/admin/ventas/cuentas" className="font-medium text-[var(--color-primario)] hover:underline">
        Cuentas corrientes
      </Link>
      <Link href="/admin/ventas/cajas" className="font-medium text-[var(--color-primario)] hover:underline">
        Cierres anteriores
      </Link>
      {puedeConfigurar && (
        <Link href="/admin/ventas/medios" className="font-medium text-[var(--color-primario)] hover:underline">
          Medios de pago
        </Link>
      )}
    </div>
  );

  if (!caja) {
    return (
      <div className="flex flex-col gap-4">
        {links}
        <form onSubmit={abrir} className="card-suave flex flex-col gap-3 rounded-xl border border-humo-100 bg-white p-5">
          <p className="font-display text-lg font-semibold text-humo-900">La caja está cerrada</p>
          <p className="text-sm text-humo-500">Para vender, cobrar o registrar gastos primero hay que abrir la caja del día.</p>
          <Campo etiqueta="Efectivo con el que arranca la caja (cambio)" className="max-w-xs">
            <InputPlata texto={inicial} onChange={setInicial} autoFocus />
          </Campo>
          <MensajeError error={error} />
          <button disabled={enviando} className="btn-primary w-fit rounded-lg px-5 py-2.5 text-sm disabled:opacity-60">
            Abrir caja
          </button>
        </form>
      </div>
    );
  }

  const activas = ventas.filter((v) => v.estado === "ACTIVA");
  const totalVendido = activas.reduce((a, v) => a + v.total, 0);

  return (
    <div className="flex flex-col gap-4">
      {aviso && <div className="rounded-xl bg-exito-50 px-4 py-2 text-sm text-exito-600">{aviso}</div>}
      <MensajeError error={error} />

      <section className="card-suave flex flex-col gap-3 rounded-xl border border-humo-100 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-display text-lg font-semibold text-humo-900">Caja abierta</p>
            <p className="text-xs text-humo-500">
              Desde las {hora(caja.abiertaEn)} del {new Date(caja.abiertaEn).toLocaleDateString("es-AR")} · abrió {caja.abiertaPor}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/ventas/nueva" className="btn-primary rounded-lg px-4 py-2 text-sm">
              + Nueva venta
            </Link>
            <button
              onClick={() => setMovForm({ tipo: "GASTO", medioPagoId: medios.find((m) => m.nombre === "Efectivo")?.id ?? medios[0]?.id ?? "", monto: "", descripcion: "" })}
              className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium"
            >
              Gasto / ingreso / retiro
            </button>
            <Link href="/admin/ventas/cerrar" className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
              Cerrar caja
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {resumen.map((r) => (
            <div key={r.medioPagoId} className="rounded-lg bg-humo-50 px-3 py-2">
              <p className="text-xs text-humo-500">{r.nombre}</p>
              <p className={`font-medium tabular-nums ${r.esperado < 0 ? "text-peligro-600" : "text-humo-900"}`}>{formatearPesos(r.esperado)}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-humo-500">
          Vendido en esta caja: <strong className="text-humo-700">{formatearPesos(totalVendido)}</strong> en {activas.length}{" "}
          {activas.length === 1 ? "venta" : "ventas"}
        </p>
      </section>

      {movForm && (
        <form onSubmit={guardarMovimiento} className="flex flex-col gap-3 rounded-xl border border-humo-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Tipo">
              <select value={movForm.tipo} onChange={(e) => setMovForm({ ...movForm, tipo: e.target.value as "GASTO" })} className={INPUT}>
                <option value="GASTO">Gasto (sale plata)</option>
                <option value="RETIRO">Retiro (sale plata)</option>
                <option value="INGRESO">Ingreso extra (entra plata)</option>
              </select>
            </Campo>
            <Campo etiqueta="Medio">
              <select value={movForm.medioPagoId} onChange={(e) => setMovForm({ ...movForm, medioPagoId: e.target.value })} className={INPUT}>
                {medios.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Monto">
              <InputPlata texto={movForm.monto} onChange={(t) => setMovForm({ ...movForm, monto: t })} autoFocus />
            </Campo>
          </div>
          <Campo etiqueta="Descripción">
            <input
              required
              value={movForm.descripcion}
              onChange={(e) => setMovForm({ ...movForm, descripcion: e.target.value })}
              placeholder="Ej: artículos de limpieza, pago a proveedor"
              className={INPUT}
            />
          </Campo>
          <div className="flex gap-2">
            <button disabled={enviando} className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-60">
              Registrar
            </button>
            <button type="button" onClick={() => setMovForm(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {links}

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-humo-900">Ventas de esta caja</h2>
        {ventas.length === 0 ? (
          <p className="text-sm text-humo-500">Todavía no hay ventas en esta caja.</p>
        ) : (
          ventas.map((v) => (
            <div
              key={v.id}
              className={`card-suave flex flex-col gap-1.5 rounded-xl border p-4 text-sm ${v.estado === "ANULADA" ? "border-humo-100 bg-humo-50" : "border-humo-100 bg-white"}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className={v.estado === "ANULADA" ? "text-humo-400 line-through" : "font-medium text-humo-900"}>
                  N° {v.numero} · {hora(v.createdAt)} · {v.tutor?.nombre ?? "Consumidor final"}
                </p>
                <p className={`tabular-nums ${v.estado === "ANULADA" ? "text-humo-400 line-through" : "font-semibold text-humo-900"}`}>
                  {formatearPesos(v.total)}
                </p>
              </div>
              <p className="text-humo-600">
                {v.items.map((i) => `${i.cantidad} × ${i.descripcion}${i.precioUnitario !== i.precioLista ? " (precio modificado)" : ""}`).join(" · ")}
              </p>
              <p className="text-xs text-humo-500">
                {v.pagos.map((p) => `${p.medioPago.nombre} ${formatearPesos(p.monto)}`).join(" + ") || "Sin pago"}
                {v.total > v.pagado && v.estado === "ACTIVA" && (
                  <span className="text-alerta-600"> · {formatearPesos(v.total - v.pagado)} a cuenta corriente</span>
                )}
                {" · "}vendió {v.usuario}
              </p>
              {v.observaciones && <p className="text-xs text-humo-400">{v.observaciones}</p>}
              {v.estado === "ANULADA" ? (
                <p className="text-xs text-peligro-600">
                  Anulada por {v.anuladaPor}: {v.motivoAnulacion}
                </p>
              ) : (
                puedeAnular &&
                (anulando?.id === v.id ? (
                  <form onSubmit={confirmarAnulacion} className="mt-1 flex flex-wrap items-center gap-2">
                    <input
                      required
                      autoFocus
                      value={anulando.motivo}
                      onChange={(e) => setAnulando({ ...anulando, motivo: e.target.value })}
                      placeholder="Motivo de la anulación"
                      className={`${INPUT} max-w-sm py-1.5 text-sm`}
                    />
                    <button disabled={enviando} className="rounded-md bg-peligro-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">
                      Confirmar anulación
                    </button>
                    <button type="button" onClick={() => setAnulando(null)} className="text-xs text-humo-500">
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setAnulando({ id: v.id, numero: v.numero, motivo: "" })}
                    className="w-fit text-xs text-peligro-600 hover:underline"
                  >
                    Anular venta
                  </button>
                ))
              )}
            </div>
          ))
        )}
      </section>

      {movimientos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-humo-900">Otros movimientos de caja</h2>
          <ul className="flex flex-col divide-y divide-humo-100 rounded-xl border border-humo-100 bg-white text-sm">
            {movimientos.map((m) => (
              <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2">
                <span>
                  {hora(m.createdAt)} · <strong>{TIPO_MOV[m.tipo]}</strong>
                  {m.pagoCuentaCorriente ? ` de ${m.pagoCuentaCorriente.tutor.nombre}` : m.descripcion ? `: ${m.descripcion}` : ""}
                  <span className="text-humo-400"> · {m.medioPago.nombre} · {m.usuario}</span>
                </span>
                <span className={`tabular-nums ${m.monto < 0 ? "text-peligro-600" : "text-exito-600"}`}>{formatearPesos(m.monto)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
