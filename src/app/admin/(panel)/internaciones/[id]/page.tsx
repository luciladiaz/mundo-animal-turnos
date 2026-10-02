import { redirect } from "next/navigation";
import InternacionDetalle from "@/components/InternacionDetalle";
import { auth } from "@/lib/auth";
import { esAdmin, tienePermiso } from "@/lib/autorizacion";

export default async function InternacionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) redirect("/admin/internados");
  const { id } = await params;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <InternacionDetalle id={id} esAdmin={esAdmin(session)} />
    </div>
  );
}
