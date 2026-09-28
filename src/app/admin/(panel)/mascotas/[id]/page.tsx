import { redirect } from "next/navigation";
import FichaMascota from "@/components/FichaMascota";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

export default async function FichaMascotaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "clientes")) redirect("/admin");
  const { id } = await params;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {/* key: al unir fichas se navega a otra mascota y el estado tiene que arrancar de cero */}
      <FichaMascota key={id} id={id} />
    </div>
  );
}
