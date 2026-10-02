import { redirect } from "next/navigation";
import DetalleCaja from "@/components/DetalleCaja";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

export default async function DetalleCajaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) redirect("/admin");
  const { id } = await params;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <DetalleCaja id={id} />
    </div>
  );
}
