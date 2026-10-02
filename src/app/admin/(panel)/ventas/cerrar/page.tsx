import { redirect } from "next/navigation";
import CierreCaja from "@/components/CierreCaja";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

export default async function CierreCajaPage() {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) redirect("/admin");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-humo-900">Cierre de caja</h1>
      <CierreCaja />
    </div>
  );
}
