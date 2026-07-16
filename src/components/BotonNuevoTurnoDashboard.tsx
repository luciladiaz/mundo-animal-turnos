"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NuevoTurnoModal from "@/components/NuevoTurnoModal";
import { getFechaHoyArgentina } from "@/lib/disponibilidad";

export default function BotonNuevoTurnoDashboard() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button onClick={() => setAbierto(true)} className="btn-primary rounded-lg px-4 py-2 text-sm">
        + Nuevo turno
      </button>
      {abierto && (
        <NuevoTurnoModal
          fechaInicial={getFechaHoyArgentina()}
          onClose={() => setAbierto(false)}
          onCreated={() => router.refresh()}
        />
      )}
    </>
  );
}
