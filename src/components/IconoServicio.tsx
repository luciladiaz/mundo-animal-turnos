// Ícono de línea por servicio — se infiere del nombre para no depender de un
// campo nuevo en la base; si no coincide con nada conocido, cae a la huella.
export default function IconoServicio({
  nombre,
  size = 18,
  stroke = "var(--color-primario)",
}: {
  nombre: string;
  size?: number;
  stroke?: string;
}) {
  const n = nombre.toLowerCase();

  if (n.includes("baño") || n.includes("peluq") || n.includes("estétic")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h16a1 1 0 0 1 1 1v1a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-1a1 1 0 0 1 1-1z" />
        <path d="M7 12V7a2 2 0 0 1 2-2h1" />
        <circle cx="7.5" cy="6.5" r="1.1" fill={stroke} stroke="none" />
        <path d="M3 21h18" />
      </svg>
    );
  }
  if (n.includes("vet") || n.includes("consulta") || n.includes("vacun")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3v5a3 3 0 0 0 6 0V3" />
        <path d="M13 3v5a3 3 0 0 0 3 3v2a5 5 0 0 1-10 0" />
        <circle cx="18" cy="16" r="2.4" />
        <path d="M16.5 15v-1a1.5 1.5 0 0 1 3 0v1" />
      </svg>
    );
  }
  if (n.includes("laborator")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2v6.5L4.5 17a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 8.5V2" />
        <path d="M9 2h6" />
        <path d="M7.5 14h9" />
      </svg>
    );
  }
  if (n.includes("fisioterap") || n.includes("rehabilitaci")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill={stroke} stroke="none" />
        <path d="M7 21l2.5-6L7 11l3-3 2 2h4" />
        <path d="M12 10l1.5 4.5L18 16" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={stroke} stroke="none">
      <ellipse cx="12" cy="15.5" rx="5" ry="4.2" />
      <ellipse cx="4.8" cy="10.2" rx="2.1" ry="2.6" transform="rotate(-18 4.8 10.2)" />
      <ellipse cx="9.3" cy="5.6" rx="2.1" ry="2.7" transform="rotate(-8 9.3 5.6)" />
      <ellipse cx="14.9" cy="5.6" rx="2.1" ry="2.7" transform="rotate(8 14.9 5.6)" />
      <ellipse cx="19.2" cy="10.2" rx="2.1" ry="2.6" transform="rotate(18 19.2 10.2)" />
    </svg>
  );
}
