"use client";

import { sumarDias } from "@/lib/disponibilidad";
import { ATAJOS_PROXIMA, PRODUCTOS, TIPO_LABEL, diasSugeridos, type TipoAplicacion } from "@/lib/planSanitario";

export interface AplicacionForm {
  tipo: TipoAplicacion;
  producto: string;
  lote: string;
  proximaFecha: string;
}

export const APLICACION_VACIA: AplicacionForm = { tipo: "VACUNA", producto: "", lote: "", proximaFecha: "" };

const INPUT =
  "w-full rounded-lg border border-humo-200 bg-white px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100";

/**
 * Una vacuna/desparasitación: al elegir el producto se completa sola la próxima fecha
 * (fechaBase + intervalo habitual). Los atajos y el calendario permiten cambiarla.
 */
export default function EditorAplicacion({
  valor,
  fechaBase,
  onChange,
  onQuitar,
}: {
  valor: AplicacionForm;
  fechaBase: string;
  onChange: (v: AplicacionForm) => void;
  onQuitar?: () => void;
}) {
  const idLista = `productos-${valor.tipo}`;

  function cambiarProducto(producto: string) {
    const dias = diasSugeridos(valor.tipo, producto);
    onChange({ ...valor, producto, proximaFecha: dias && fechaBase ? sumarDias(fechaBase, dias) : valor.proximaFecha });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-humo-200 bg-humo-50 p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_0.8fr]">
        <select
          value={valor.tipo}
          onChange={(e) => onChange({ ...valor, tipo: e.target.value as TipoAplicacion, producto: "", proximaFecha: "" })}
          className={INPUT}
          aria-label="Tipo"
        >
          {(Object.keys(TIPO_LABEL) as TipoAplicacion[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_LABEL[t]}
            </option>
          ))}
        </select>
        <input
          required
          list={idLista}
          value={valor.producto}
          onChange={(e) => cambiarProducto(e.target.value)}
          placeholder={valor.tipo === "VACUNA" ? "Elegí o escribí la vacuna" : "Elegí o escribí el producto"}
          className={INPUT}
          aria-label="Vacuna o producto"
        />
        <datalist id={idLista}>
          {PRODUCTOS[valor.tipo].map((p) => (
            <option key={p.nombre} value={p.nombre} />
          ))}
        </datalist>
        <input
          value={valor.lote}
          onChange={(e) => onChange({ ...valor, lote: e.target.value })}
          placeholder="Lote (opcional)"
          className={INPUT}
          aria-label="Lote"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-humo-600">Próxima dosis:</span>
        <input
          type="date"
          value={valor.proximaFecha}
          onChange={(e) => onChange({ ...valor, proximaFecha: e.target.value })}
          className="rounded-lg border border-humo-200 bg-white px-2 py-1"
          aria-label="Próxima dosis"
        />
        {fechaBase &&
          ATAJOS_PROXIMA.map((a) => (
            <button
              key={a.dias}
              type="button"
              onClick={() => onChange({ ...valor, proximaFecha: sumarDias(fechaBase, a.dias) })}
              className="rounded-full border border-humo-200 bg-white px-2 py-0.5 text-xs text-humo-600 hover:border-mora-300"
            >
              +{a.texto}
            </button>
          ))}
        {valor.proximaFecha && (
          <button type="button" onClick={() => onChange({ ...valor, proximaFecha: "" })} className="text-xs text-humo-400 hover:text-humo-700">
            No repetir
          </button>
        )}
        {onQuitar && (
          <button type="button" onClick={onQuitar} className="ml-auto text-xs text-peligro-600 hover:underline">
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}
