import { redirect } from "next/navigation";
import NuevaVenta from "@/components/NuevaVenta";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

export default async function NuevaVentaPage() {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) redirect("/admin");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-humo-900">Nueva venta</h1>
      <NuevaVenta />
    </div>
  );
}
