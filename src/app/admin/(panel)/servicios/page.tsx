import { redirect } from "next/navigation";
import ServiciosPanel from "@/components/ServiciosPanel";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

export default async function ServiciosPage() {
  const session = await auth();
  if (!tienePermiso(session, "servicios")) redirect("/admin");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-humo-900">Servicios</h1>
      <ServiciosPanel />
    </div>
  );
}
