import { redirect } from "next/navigation";
import InternadosPanel from "@/components/InternadosPanel";
import { auth } from "@/lib/auth";
import { puedeVerInternados } from "@/lib/autorizacion";

export default async function InternadosPage() {
  const session = await auth();
  if (!puedeVerInternados(session)) redirect("/admin");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-humo-900">Internados</h1>
      <InternadosPanel />
    </div>
  );
}
