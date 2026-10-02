"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatearPesos } from "@/lib/plata";
import { INPUT, InputPlata, MensajeError, aCentavos } from "@/components/ui/Campos";

interface Resumen {
  medioPagoId: string;
  nombre: string;
  inicial: number;
  movimientos: number;
  esperado: number;
}

export default function CierreCaja() {
  const router = useRouter();
  const [resumen, setResumen] = useState<Resumen[] | null>(null);
  const [sinCaja, setSinCaja] = useState(false);
  const [contado, setContado] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await (await fetch("/api/caja")).json();
      if (!data.caja) return setSinCaja(true);
      setResumen(data.resumen);
    })();
  }, []);

  if (sinCaja) {
    return (
      <p className="text-sm text-humo-500">
        No hay ninguna caja abierta.{" "}
        <Link href="/admin/ventas" className="text-[var(--color-primario)] hover:underline">
          Volver
        </Link>
      </p>
    );
  }
  if (!resumen) return <p className="text-sm text-humo-500">Cargando...</p>;

  const filas = resumen.map((r) => {
    const valor = contado[r.medioPagoId] ?? "";
    const c = valor.trim() ? aCentavos(valor) : null;
    return { ...r, valor, contado: c, diferencia: c == null ? null : c - r.esperado };
  });
  const totalEsperado = filas.reduce((a, f) => a + f.esperado, 0);
  const completos = filas.every((f) => f.contado != null && f.contado >= 0);
  const totalContado = filas.reduce((a, f) => a + (f.contado ?? 0), 0);

  async function cerrar(e: React.FormEvent) {
    e.preventDefault();
    if (!completos) return setError("Cargá lo contado en todos los medios (si no hay nada, poné 0)");
    const diferencias = filas.filter((f) => f.diferencia !== 0);
    if (diferencias.length > 0 && !observaciones.trim()) {
      return setError("Hay diferencias: escribí una observación explicando qué pasó");
    }
    if (!window.confirm("¿Cerrar la caja? Después de cerrarla no se puede modificar.")) return;
    setError(null);
    setEnviando(true);
    const res = await fetch("/api/caja/cerrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conteos: filas.map((f) => ({ medioPagoId: f.medioPagoId, contado: f.contado })), observaciones }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) {
      // Si entró una venta mientras se contaba, lo esperado cambió: se recarga el resumen.
      setError(data.error ?? "No se pudo cerrar la caja");
      const nuevo = await (await fetch("/api/caja")).json();
      if (nuevo.resumen) setResumen(nuevo.resumen);
      return;
    }
    router.push(`/admin/ventas/cajas/${data.caja.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={cerrar} className="flex flex-col gap-4">
      <p className="text-sm text-humo-600">
        Contá lo que hay en cada medio (el efectivo del cajón, el total del posnet de débito y de crédito, las transferencias y el QR recibidos) y cargalo.
        El sistema te muestra la diferencia con lo que debería haber.
      </p>
      <div className="overflow-x-auto rounded-xl border border-humo-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-humo-100 text-left text-xs text-humo-500">
              <th className="px-4 py-2 font-medium">Medio</th>
              <th className="px-4 py-2 text-right font-medium">Debería haber</th>
              <th className="px-4 py-2 font-medium">Contado</th>
              <th className="px-4 py-2 text-right font-medium">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.medioPagoId} className="border-b border-humo-50">
                <td className="px-4 py-2">
                  <p className="font-medium text-humo-900">{f.nombre}</p>
                  {f.inicial > 0 && <p className="text-xs text-humo-400">incluye {formatearPesos(f.inicial)} de cambio inicial</p>}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{formatearPesos(f.esperado)}</td>
                <td className="w-44 px-4 py-2">
                  <InputPlata texto={f.valor} onChange={(t) => setContado((c) => ({ ...c, [f.medioPagoId]: t }))} ariaLabel={`Contado en ${f.nombre}`} />
                </td>
                <td
                  className={`px-4 py-2 text-right font-medium tabular-nums ${
                    f.diferencia == null ? "text-humo-300" : f.diferencia === 0 ? "text-exito-600" : "text-peligro-600"
                  }`}
                >
                  {f.diferencia == null ? "—" : f.diferencia === 0 ? "✓ Cuadra" : `${f.diferencia > 0 ? "Sobran" : "Faltan"} ${formatearPesos(Math.abs(f.diferencia))}`}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatearPesos(totalEsperado)}</td>
              <td className="px-4 py-2 tabular-nums">{completos ? formatearPesos(totalContado) : ""}</td>
              <td className="px-4 py-2 text-right tabular-nums">{completos ? formatearPesos(totalContado - totalEsperado) : ""}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-humo-600">Observaciones (obligatorias si hay diferencias)</span>
        <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={INPUT} />
      </label>
      <MensajeError error={error} />
      <div className="flex gap-2">
        <button disabled={enviando} className="btn-primary rounded-lg px-5 py-2.5 text-sm disabled:opacity-60">
          {enviando ? "Cerrando..." : "Cerrar caja"}
        </button>
        <Link href="/admin/ventas" className="btn-secondary rounded-lg px-4 py-2.5 text-sm font-medium">
          Volver
        </Link>
      </div>
    </form>
  );
}
