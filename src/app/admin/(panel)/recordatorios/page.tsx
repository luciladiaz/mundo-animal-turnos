import { redirect } from "next/navigation";
import RecordatoriosPanel from "@/components/RecordatoriosPanel";
import { auth } from "@/lib/auth";
import { puedeVerFichas, tienePermiso } from "@/lib/autorizacion";

export default async function RecordatoriosPage() {
  const session = await auth();
  if (!tienePermiso(session, "recordatorios")) redirect("/admin");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-humo-900">Recordatorios de vacunas</h1>
        <p className="text-sm text-humo-500">Vacunas y desparasitaciones vencidas o que vencen en los próximos 30 días.</p>
      </div>
      <RecordatoriosPanel puedeVerFichas={puedeVerFichas(session)} />
    </div>
  );
}
