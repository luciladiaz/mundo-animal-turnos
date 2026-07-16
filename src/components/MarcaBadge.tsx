import Image from "next/image";

interface Props {
  logoUrl?: string | null;
  nombre: string;
  size?: number;
  className?: string;
}

// Insignia circular de marca: usa el logo real subido por el admin si existe;
// si no, muestra la inicial del negocio sobre un degradé mora→celeste como
// placeholder honesto en vez de imitar el logo real que todavía no tenemos como archivo.
export default function MarcaBadge({ logoUrl, nombre, size = 40, className = "" }: Props) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={nombre}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, background: "linear-gradient(135deg, var(--color-primario), var(--color-secundario))" }}
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white ${className}`}
    >
      <span style={{ fontSize: size * 0.45 }}>{nombre.charAt(0).toUpperCase()}</span>
    </div>
  );
}
