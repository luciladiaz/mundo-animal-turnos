"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatearPesos } from "@/lib/plata";

interface CajaCerrada {
  id: string;
  abiertaEn: string;
  cerradaEn: string;
  cerradaPor: string;
  ventas: number;
  esperado: number;
  contado: number;
}

const fechaHora = (f: string) =>
  new Date(f).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

export default function HistorialCajas() {
  const [cajas, setCajas] = useState<CajaCerrada[] | null>(null);
  useEffect(() => {
    (async () => setCajas((await (await fetch("/api/caja/historial")).json()).cajas ?? []))();
  }, []);

  if (!cajas) return <p className="text-sm text-humo-500">Cargando...</p>;
  if (cajas.length === 0) return <p className="text-sm text-humo-500">Todavía no hay cajas cerradas.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {cajas.map((c) => {
        const dif = c.contado - c.esperado;
        return (
          <li key={c.id}>
            <Link href={`/admin/ventas/cajas/${c.id}`} className="card-suave flex flex-wrap items-center justify-between gap-2 rounded-xl border border-humo-100 bg-white p-4 text-sm hover:border-mora-200">
              <span>
                <strong>{fechaHora(c.abiertaEn)}</strong> → {fechaHora(c.cerradaEn)}
                <span className="text-humo-400"> · {c.ventas} ventas · cerró {c.cerradaPor}</span>
              </span>
              <span className={`font-medium tabular-nums ${dif === 0 ? "text-exito-600" : "text-peligro-600"}`}>
                {dif === 0 ? "✓ Cuadró" : `${dif > 0 ? "Sobraron" : "Faltaron"} ${formatearPesos(Math.abs(dif))}`}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
