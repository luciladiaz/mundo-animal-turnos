"use client";

import { aCentavos, centavosATexto } from "@/lib/plata";

const BASE_INPUT =
  "rounded-lg border border-humo-200 bg-white px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100";
export const INPUT = `w-full ${BASE_INPUT}`;
/** Igual que INPUT pero sin ancho completo: para selects/campos chicos dentro de una fila. */
export const INPUT_CHICO = BASE_INPUT;

export function Campo({ etiqueta, children, className = "" }: { etiqueta: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="text-humo-600">{etiqueta}</span>
      {children}
    </label>
  );
}

/**
 * Campo de plata: se escribe en pesos ("1.234,50") y se trabaja en centavos.
 * `texto` es lo que está escrito; usá aCentavos(texto) para leerlo.
 */
export function InputPlata({
  texto,
  onChange,
  placeholder = "0",
  className = "",
  autoFocus,
  ariaLabel,
}: {
  texto: string;
  onChange: (texto: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
}) {
  const invalido = texto.trim() !== "" && aCentavos(texto) == null;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-humo-400">$</span>
      <input
        inputMode="decimal"
        value={texto}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${INPUT} pl-7 tabular-nums ${invalido ? "border-peligro-500" : ""} ${className}`}
      />
    </div>
  );
}

export { aCentavos, centavosATexto };

export function MensajeError({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="rounded-xl bg-peligro-50 px-4 py-2 text-sm text-peligro-600">{error}</div>;
}
