import { claveTelefono } from "@/lib/fichas";

/** "2026-07-15" → "15/07/2026" */
export function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

/** Edad legible a partir de "2021-03-15" y la fecha de hoy ("2026-09-28"): "5 años y 6 meses". */
export function calcularEdad(fechaNacimiento: string, hoy: string): string | null {
  const [ny, nm, nd] = fechaNacimiento.split("-").map(Number);
  const [hy, hm, hd] = hoy.split("-").map(Number);
  let meses = (hy - ny) * 12 + (hm - nm);
  if (hd < nd) meses -= 1;
  if (meses < 0) return null;
  if (meses === 0) return "menos de 1 mes";
  const años = Math.floor(meses / 12);
  const resto = meses % 12;
  const txtAños = años === 1 ? "1 año" : `${años} años`;
  const txtMeses = resto === 1 ? "1 mes" : `${resto} meses`;
  if (años === 0) return txtMeses;
  if (resto === 0) return txtAños;
  return `${txtAños} y ${txtMeses}`;
}

/**
 * Link de WhatsApp para un celular argentino: 549 + código de área + número.
 * Si el teléfono no tiene 10 dígitos (fijo, incompleto) no se arma el link.
 */
export function linkWhatsApp(telefono: string, texto?: string): string | null {
  const clave = claveTelefono(telefono);
  if (clave.length !== 10) return null;
  return `https://wa.me/549${clave}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
