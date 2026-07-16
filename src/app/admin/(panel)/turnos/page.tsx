import TurnosPanel from "@/components/TurnosPanel";

export default function TurnosPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-humo-900">Turnos</h1>
      <TurnosPanel />
    </div>
  );
}
