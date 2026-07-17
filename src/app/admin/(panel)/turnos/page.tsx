import { redirect } from "next/navigation";
import TurnosPanel from "@/components/TurnosPanel";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

export default async function TurnosPage() {
  const session = await auth();
  if (!tienePermiso(session, "turnos")) redirect("/admin");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-humo-900">Turnos</h1>
      <TurnosPanel />
    </div>
  );
}
