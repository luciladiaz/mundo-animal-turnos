import { redirect } from "next/navigation";
import FichaCliente from "@/components/FichaCliente";
import { auth } from "@/lib/auth";
import { puedeVerFichas, tienePermiso } from "@/lib/autorizacion";

export default async function FichaClientePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!puedeVerFichas(session)) redirect("/admin");
  const { id } = await params;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <FichaCliente id={id} puedeVender={tienePermiso(session, "ventas")} />
    </div>
  );
}
