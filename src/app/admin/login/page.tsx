import { prisma } from "@/lib/prisma";
import MarcaBadge from "@/components/MarcaBadge";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const configuracion = await prisma.configuracionNegocio.findFirst();
  const negocioNombre = configuracion?.nombre ?? "Mundo Animal";

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-mora-50 via-celeste-50/30 to-humo-50 px-4">
      <div className="card-suave flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-humo-100 bg-white p-8">
        <div className="flex flex-col items-center gap-3">
          <MarcaBadge logoUrl={configuracion?.logoUrl} nombre={negocioNombre} size={56} />
          <div className="text-center">
            <h1 className="font-display text-lg font-semibold text-humo-900">{negocioNombre}</h1>
            <p className="text-xs text-humo-400">Panel de administración</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
