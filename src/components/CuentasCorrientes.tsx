"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatearPesos } from "@/lib/plata";

interface Saldo {
  id: string;
  nombre: string;
  telefono: string;
  saldo: number;
}

export default function CuentasCorrientes() {
  const [saldos, setSaldos] = useState<Saldo[] | null>(null);
  useEffect(() => {
    (async () => setSaldos((await (await fetch("/api/cuentas-corrientes")).json()).saldos ?? []))();
  }, []);

  if (!saldos) return <p className="text-sm text-humo-500">Cargando...</p>;
  if (saldos.length === 0) return <p className="text-sm text-humo-500">Ningún cliente debe plata.</p>;
  const total = saldos.filter((s) => s.saldo > 0).reduce((a, s) => a + s.saldo, 0);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-humo-600">
        Total a cobrar: <strong className="tabular-nums">{formatearPesos(total)}</strong>. Para cobrar, entrá a la ficha del cliente.
      </p>
      <ul className="flex flex-col divide-y divide-humo-100 rounded-xl border border-humo-100 bg-white text-sm">
        {saldos.map((s) => (
          <li key={s.id}>
            <Link href={`/admin/clientes/${s.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-mora-50">
              <span>
                {s.nombre} <span className="text-humo-400">· {s.telefono}</span>
              </span>
              <span className={`font-medium tabular-nums ${s.saldo > 0 ? "text-alerta-600" : "text-exito-600"}`}>
                {s.saldo > 0 ? `Debe ${formatearPesos(s.saldo)}` : `A favor ${formatearPesos(-s.saldo)}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
