// Búsqueda dentro de la historia clínica de una mascota. Todo en el navegador: la
// historia de una mascota ya está cargada completa, así que no hace falta ir al servidor.
// Sin distinguir mayúsculas ni acentos ("otitis" encuentra "Otitis" y "otítis").

/** Minúsculas y sin acentos, carácter por carácter, así el largo no cambia y las posiciones sirven para resaltar. */
export function normalizar(texto: string): string {
  return Array.from(texto)
    .map((c) => {
      const n = c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      return n.length === 1 ? n : c.toLowerCase().charAt(0) || c;
    })
    .join("");
}

/** "Otitis  meloxicam" → ["otitis", "meloxicam"]; tienen que aparecer todas. */
export function terminosDeBusqueda(q: string): string[] {
  return normalizar(q)
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** Posiciones [inicio, fin) de cada aparición de los términos en el texto, sin superponerse. */
export function rangosResaltado(texto: string, terminos: string[]): [number, number][] {
  if (terminos.length === 0) return [];
  const norm = normalizar(texto);
  if (norm.length !== texto.length) return [];
  const rangos: [number, number][] = [];
  for (const t of terminos) {
    let desde = 0;
    for (;;) {
      const i = norm.indexOf(t, desde);
      if (i === -1) break;
      rangos.push([i, i + t.length]);
      desde = i + t.length;
    }
  }
  rangos.sort((a, b) => a[0] - b[0]);
  const unidos: [number, number][] = [];
  for (const r of rangos) {
    const ultimo = unidos[unidos.length - 1];
    if (ultimo && r[0] <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], r[1]);
    else unidos.push([...r]);
  }
  return unidos;
}

/**
 * Primer fragmento (con algo de contexto) de los textos dados donde aparece alguno de
 * los términos, para mostrarlo en la vista compacta: "…gotas óticas por otitis externa…".
 */
export function fragmentoConCoincidencia(
  textos: { etiqueta: string; texto: string | null }[],
  terminos: string[],
  contexto = 50
): { etiqueta: string; texto: string } | null {
  if (terminos.length === 0) return null;
  for (const { etiqueta, texto } of textos) {
    if (!texto) continue;
    const rangos = rangosResaltado(texto, terminos);
    if (rangos.length === 0) continue;
    const [inicio, fin] = rangos[0];
    const desde = Math.max(0, inicio - contexto);
    const hasta = Math.min(texto.length, fin + contexto);
    const recorte = texto.slice(desde, hasta).replace(/\s+/g, " ");
    return { etiqueta, texto: `${desde > 0 ? "…" : ""}${recorte}${hasta < texto.length ? "…" : ""}` };
  }
  return null;
}
