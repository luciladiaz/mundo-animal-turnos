import { redirect } from "next/navigation";
import FichaMascota from "@/components/FichaMascota";
import { auth } from "@/lib/auth";
import { puedeVerFichas, tienePermiso } from "@/lib/autorizacion";

export default async function FichaMascotaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ turno?: string }>;
}) {
  const session = await auth();
  if (!puedeVerFichas(session)) redirect("/admin");
  const [{ id }, { turno }] = await Promise.all([params, searchParams]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {/* key: al unir fichas se navega a otra mascota y el estado tiene que arrancar de cero */}
      <FichaMascota
        key={`${id}-${turno ?? ""}`}
        id={id}
        puedeVerHistoria={tienePermiso(session, "historia")}
        turnoParaConsulta={turno ?? null}
      />
    </div>
  );
}
