"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SITIO_PUBLICO, formatearFecha, linkWhatsApp } from "@/lib/formatoFichas";
import { getFechaHoyArgentina, sumarDias } from "@/lib/disponibilidad";

interface Pendiente {
  id: string;
  producto: string;
  proximaFecha: string;
  recordatorioEnviado: string | null;
  recordatorioEnviadoPor: string | null;
  mascota: {
    id: string;
    nombre: string;
    tutor: { id: string; nombre: string; telefono: string; aceptaRecordatorios: boolean };
  };
}

function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

// Frases neutras ("cuidar su salud", "se le pasó") porque no siempre está cargado el sexo.
function mensaje(p: Pendiente, negocio: string, hoy: string): string {
  const fecha = formatearFecha(p.proximaFecha);
  const cuerpo =
    p.proximaFecha < hoy
      ? `A ${p.mascota.nombre} se le pasó la fecha de la ${p.producto} (era el ${fecha}). ` +
        `Te recomendamos aplicarla cuanto antes para que no quede sin protección.`
      : `A ${p.mascota.nombre} le toca la ${p.producto} el ${fecha}. ` +
        `Tener sus vacunas al día es la mejor forma de cuidar su salud.`;
  return (
    `¡Hola, ${primerNombre(p.mascota.tutor.nombre)}! Te escribimos de ${negocio} 🐾\n` +
    `${cuerpo}\n` +
    `Reservá tu turno acá: ${SITIO_PUBLICO}\n` +
    `¡Te esperamos!`
  );
}

export default function RecordatoriosPanel({ puedeVerFichas }: { puedeVerFichas: boolean }) {
  const [pendientes, setPendientes] = useState<Pendiente[] | null>(null);
  const [negocio, setNegocio] = useState("la veterinaria");

  const cargar = useCallback(async () => {
    const res = await fetch("/api/recordatorios");
    const data = await res.json();
    setPendientes(data.pendientes ?? []);
    if (data.negocio) setNegocio(data.negocio);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar.
    cargar();
  }, [cargar]);

  async function actualizar(id: string, datos: { recordatorioEnviado?: boolean; resuelta?: boolean }) {
    await fetch(`/api/aplicaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    await cargar();
  }

  if (pendientes === null) return <p className="text-sm text-humo-500">Cargando recordatorios...</p>;

  const hoy = getFechaHoyArgentina();
  const enUnaSemana = sumarDias(hoy, 7);
  const grupos = [
    { titulo: "Vencidas", items: pendientes.filter((p) => p.proximaFecha < hoy), color: "text-peligro-600" },
    { titulo: "Esta semana", items: pendientes.filter((p) => p.proximaFecha >= hoy && p.proximaFecha <= enUnaSemana), color: "text-alerta-600" },
    { titulo: "Próximos 30 días", items: pendientes.filter((p) => p.proximaFecha > enUnaSemana), color: "text-humo-700" },
  ];

  if (pendientes.length === 0) {
    return (
      <p className="text-sm text-humo-500">
        No hay vacunas ni desparasitaciones vencidas o por vencer en los próximos 30 días. Aparecen acá cuando el veterinario
        las registra en la ficha de cada mascota.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {grupos.map(
        (g) =>
          g.items.length > 0 && (
            <section key={g.titulo} className="flex flex-col gap-2">
              <h2 className={`font-display text-lg font-semibold ${g.color}`}>
                {g.titulo} <span className="text-sm font-normal text-humo-400">({g.items.length})</span>
              </h2>
              {g.items.map((p) => {
                const whatsapp = linkWhatsApp(p.mascota.tutor.telefono, mensaje(p, negocio, hoy));
                return (
                  <div key={p.id} className="card-suave flex flex-col gap-2 rounded-xl border border-humo-100 bg-white p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-humo-900">
                        <strong>{p.producto}</strong> · <span className="tabular-nums">{formatearFecha(p.proximaFecha)}</span>
                      </p>
                      {p.recordatorioEnviado && (
                        <span className="flex items-center gap-2">
                          <span className="rounded-full bg-exito-50 px-2 py-0.5 text-xs text-exito-600">
                            ✓ Avisado el {new Date(p.recordatorioEnviado).toLocaleDateString("es-AR")}
                            {p.recordatorioEnviadoPor && ` por ${p.recordatorioEnviadoPor}`}
                          </span>
                          <button
                            onClick={() => actualizar(p.id, { recordatorioEnviado: false })}
                            className="text-xs text-humo-400 hover:text-humo-700"
                          >
                            Desmarcar
                          </button>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-humo-600">
                      {puedeVerFichas ? (
                        <Link href={`/admin/mascotas/${p.mascota.id}`} className="font-medium text-humo-800 hover:underline">
                          {p.mascota.nombre}
                        </Link>
                      ) : (
                        <span className="font-medium text-humo-800">{p.mascota.nombre}</span>
                      )}{" "}
                      · {p.mascota.tutor.nombre} · <span className="tabular-nums">{p.mascota.tutor.telefono}</span>
                    </p>
                    {!p.mascota.tutor.aceptaRecordatorios && (
                      <p className="text-xs text-humo-400">Este cliente todavía no tiene registrado su permiso para recibir recordatorios.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {whatsapp ? (
                        <a
                          href={whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${p.recordatorioEnviado ? "btn-secondary font-medium" : "btn-primary"} rounded-md px-3 py-1.5 text-xs`}
                        >
                          {p.recordatorioEnviado ? "Volver a avisar por WhatsApp" : "Avisar por WhatsApp"}
                        </a>
                      ) : (
                        <span className="text-xs text-alerta-600">El teléfono no parece un celular: revisalo en la ficha.</span>
                      )}
                      {/* Abrir WhatsApp no garantiza que se haya mandado: se marca a mano. */}
                      {!p.recordatorioEnviado && (
                        <button
                          onClick={() => actualizar(p.id, { recordatorioEnviado: true })}
                          className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
                        >
                          ✓ Ya le envié el mensaje
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Sacar este recordatorio de ${p.mascota.nombre}? No va a volver a aparecer.`)) {
                            actualizar(p.id, { resuelta: true });
                          }
                        }}
                        className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
                      >
                        No recordar más
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          )
      )}
    </div>
  );
}
