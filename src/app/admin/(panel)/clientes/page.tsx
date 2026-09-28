import { redirect } from "next/navigation";
import ClientesPanel from "@/components/ClientesPanel";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

export default async function ClientesPage() {
  const session = await auth();
  if (!tienePermiso(session, "clientes")) redirect("/admin");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-humo-900">Clientes</h1>
      <ClientesPanel />
    </div>
  );
}
