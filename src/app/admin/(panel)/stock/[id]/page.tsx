import { redirect } from "next/navigation";
import FichaProducto from "@/components/FichaProducto";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

export default async function FichaProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "stock")) redirect("/admin");
  const { id } = await params;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <FichaProducto id={id} puedeAjustar={tienePermiso(session, "anular")} />
    </div>
  );
}
