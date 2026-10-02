import { redirect } from "next/navigation";
import { Suspense } from "react";
import VentasPanel from "@/components/VentasPanel";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

export default async function VentasPanelPage() {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) redirect("/admin");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-humo-900">Ventas y caja</h1>
      <Suspense><VentasPanel puedeAnular={tienePermiso(session, "anular")} puedeConfigurar={tienePermiso(session, "configuracion")} /></Suspense>
    </div>
  );
}
