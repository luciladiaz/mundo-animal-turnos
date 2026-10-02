import { redirect } from "next/navigation";
import MediosPagoPanel from "@/components/MediosPagoPanel";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

export default async function MediosPagoPanelPage() {
  const session = await auth();
  if (!tienePermiso(session, "configuracion")) redirect("/admin");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-humo-900">Medios de pago</h1>
      <MediosPagoPanel />
    </div>
  );
}
