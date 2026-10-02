// La plata se maneja SIEMPRE en centavos enteros (Int) para que los cierres de caja
// no tengan errores de redondeo. Solo se convierte a pesos para mostrarla.

/** 123456 → "$ 1.234,56" */
export function formatearPesos(centavos: number): string {
  const signo = centavos < 0 ? "-" : "";
  const abs = Math.abs(centavos);
  const pesos = Math.floor(abs / 100).toLocaleString("es-AR");
  const cent = String(abs % 100).padStart(2, "0");
  return `${signo}$ ${pesos},${cent}`;
}

/**
 * Lo que se escribe en un campo de precio ("1.234,50", "1234.5", "1234") → centavos.
 * Devuelve null si no es un número válido.
 */
export function aCentavos(texto: string): number | null {
  const limpio = texto.trim().replace(/\$/g, "").replace(/\s/g, "");
  if (!limpio) return null;
  let normal: string;
  if (limpio.includes(",")) {
    // Formato argentino: punto de miles, coma decimal.
    normal = limpio.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    // "1.234" o "12.345.678": puntos de miles sin decimales.
    normal = limpio.replace(/\./g, "");
  } else {
    normal = limpio;
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(normal)) return null;
  return Math.round(Number(normal) * 100);
}

/** Para precargar un input: 123450 → "1.234,50", 1250000 → "12.500" (aCentavos lo vuelve a leer igual). */
export function centavosATexto(centavos: number): string {
  const abs = Math.abs(centavos);
  const resto = abs % 100;
  const pesos = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${centavos < 0 ? "-" : ""}${pesos}${resto ? "," + String(resto).padStart(2, "0") : ""}`;
}
