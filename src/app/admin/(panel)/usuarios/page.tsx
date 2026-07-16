import { redirect } from "next/navigation";
import UsuariosPanel from "@/components/UsuariosPanel";
import { auth } from "@/lib/auth";
import { esAdmin } from "@/lib/autorizacion";

export default async function UsuariosPage() {
  const session = await auth();
  if (!esAdmin(session)) redirect("/admin/turnos");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-humo-900">Usuarios</h1>
      <UsuariosPanel />
    </div>
  );
}
