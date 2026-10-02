"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatearPesos } from "@/lib/plata";

interface Caja {
  id: string;
  estado: "ABIERTA" | "CERRADA";
  abiertaEn: string;
  abiertaPor: string;
  efectivoInicial: number;
  cerradaEn: string | null;
  cerradaPor: string | null;
  observacionesCierre: string | null;
  conteos: { id: string; esperado: number; contado: number; medioPago: { nombre: string } }[];
  movimientos: {
    id: string;
    tipo: string;
    monto: number;
    descripcion: string | null;
    usuario: string;
    createdAt: string;
    medioPago: { nombre: string };
    venta: { numero: number } | null;
  }[];
}

const TIPOS: Record<string, string> = {
  VENTA: "Venta",
  ANULACION_VENTA: "Anulación",
  COBRO_CUENTA_CORRIENTE: "Cobro cuenta corriente",
  GASTO: "Gasto",
  INGRESO: "Ingreso",
  RETIRO: "Retiro",
};
const fechaHora = (f: string) =>
  new Date(f).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

export default function DetalleCaja({ id }: { id: string }) {
  const [caja, setCaja] = useState<Caja | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/caja/${id}`);
      if (!res.ok) return setError(true);
      setCaja((await res.json()).caja);
    })();
  }, [id]);

  if (error) return <p className="text-sm text-humo-500">No se encontró esta caja.</p>;
  if (!caja) return <p className="text-sm text-humo-500">Cargando...</p>;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/ventas/cajas" className="w-fit text-sm text-humo-500 hover:text-humo-800">
        ← Cierres anteriores
      </Link>
      <section className="card-suave rounded-xl border border-humo-100 bg-white p-4 text-sm">
        <p className="font-display text-lg font-semibold text-humo-900">Caja {caja.estado === "CERRADA" ? "cerrada" : "abierta"}</p>
        <p className="text-humo-600">
          Abierta el {fechaHora(caja.abiertaEn)} por {caja.abiertaPor}, con {formatearPesos(caja.efectivoInicial)} de cambio.
        </p>
        {caja.cerradaEn && (
          <p className="text-humo-600">
            Cerrada el {fechaHora(caja.cerradaEn)} por {caja.cerradaPor}.
          </p>
        )}
        {caja.observacionesCierre && <p className="mt-1 text-humo-500">Observaciones: {caja.observacionesCierre}</p>}
      </section>

      {caja.conteos.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-humo-100 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-humo-100 text-left text-xs text-humo-500">
                <th className="px-4 py-2 font-medium">Medio</th>
                <th className="px-4 py-2 text-right font-medium">Esperado</th>
                <th className="px-4 py-2 text-right font-medium">Contado</th>
                <th className="px-4 py-2 text-right font-medium">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {caja.conteos.map((c) => {
                const dif = c.contado - c.esperado;
                return (
                  <tr key={c.id} className="border-b border-humo-50">
                    <td className="px-4 py-2">{c.medioPago.nombre}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatearPesos(c.esperado)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatearPesos(c.contado)}</td>
                    <td className={`px-4 py-2 text-right font-medium tabular-nums ${dif === 0 ? "text-exito-600" : "text-peligro-600"}`}>
                      {dif === 0 ? "✓" : formatearPesos(dif)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-humo-900">Movimientos</h2>
        <ul className="flex flex-col divide-y divide-humo-100 rounded-xl border border-humo-100 bg-white text-sm">
          {caja.movimientos.map((m) => (
            <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2">
              <span>
                {fechaHora(m.createdAt)} · <strong>{TIPOS[m.tipo] ?? m.tipo}</strong>
                {m.venta && ` N° ${m.venta.numero}`}
                {m.descripcion && <span className="text-humo-500"> · {m.descripcion}</span>}
                <span className="text-humo-400"> · {m.medioPago.nombre} · {m.usuario}</span>
              </span>
              <span className={`tabular-nums ${m.monto < 0 ? "text-peligro-600" : "text-humo-900"}`}>{formatearPesos(m.monto)}</span>
            </li>
          ))}
          {caja.movimientos.length === 0 && <li className="px-4 py-2 text-humo-500">Sin movimientos.</li>}
        </ul>
      </section>
    </div>
  );
}
