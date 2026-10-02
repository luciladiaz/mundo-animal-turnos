"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { linkWhatsApp } from "@/lib/formatoFichas";
import { COLOR_ESTADO_PARTE as COLOR_ESTADO, ESTADO_PARTE, fechaHoraAR, type EstadoParte } from "@/lib/estadosInternacion";

interface Mascota {
  id: string;
  nombre: string;
  especie: string | null;
  tutor: { id: string; nombre: string; telefono: string };
}
interface Parte {
  id: string;
  estado: EstadoParte;
  parteFamilia: string;
  autor: string;
  enviadoEn: string | null;
  enviadoPor: string | null;
  createdAt: string;
}
interface Activa {
  id: string;
  ingresoEn: string;
  motivo: string;
  veterinario: string;
  mascota: Mascota;
  partes: Parte[];
}
interface Alta {
  id: string;
  egresoEn: string;
  indicacionesAlta: string | null;
  mascota: Mascota;
}

const primerNombre = (n: string) => n.trim().split(/\s+/)[0] ?? n;

function diasInternado(desde: string): string {
  const dias = Math.floor((Date.now() - new Date(desde).getTime()) / (24 * 60 * 60 * 1000));
  return dias === 0 ? "ingresó hoy" : dias === 1 ? "1 día internado/a" : `${dias} días internado/a`;
}

function mensajeParte(i: Activa, p: Parte, negocio: string) {
  const e = ESTADO_PARTE[p.estado];
  return (
    `¡Hola, ${primerNombre(i.mascota.tutor.nombre)}! Te escribimos de ${negocio} 🐾\n` +
    `Te pasamos el parte de ${i.mascota.nombre} (${fechaHoraAR(p.createdAt)}):\n` +
    `${e.emoji} ${e.texto}\n${p.parteFamilia}\n` +
    `Cualquier consulta, escribinos.`
  );
}

function mensajeAlta(a: Alta, negocio: string) {
  return (
    `¡Hola, ${primerNombre(a.mascota.tutor.nombre)}! Te escribimos de ${negocio} 🐾\n` +
    `Buenas noticias: ${a.mascota.nombre} ya tiene el alta.\n` +
    `Indicaciones para la casa:\n${a.indicacionesAlta ?? ""}\n` +
    `Cualquier duda, escribinos.`
  );
}

export default function InternadosPanel() {
  const [activas, setActivas] = useState<Activa[] | null>(null);
  const [altas, setAltas] = useState<Alta[]>([]);
  const [negocio, setNegocio] = useState("la veterinaria");
  const [esVeterinario, setEsVeterinario] = useState(false);

  const cargar = useCallback(async () => {
    const data = await (await fetch("/api/internaciones")).json();
    setActivas(data.activas ?? []);
    setAltas(data.altas ?? []);
    if (data.negocio) setNegocio(data.negocio);
    setEsVeterinario(Boolean(data.esVeterinario));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial; se refresca cada minuto para ver partes nuevos.
    cargar();
    const t = setInterval(cargar, 60_000);
    return () => clearInterval(t);
  }, [cargar]);

  async function marcarParte(internacionId: string, parteId: string, enviado: boolean) {
    await fetch(`/api/internaciones/${internacionId}/partes/${parteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enviado }),
    });
    await cargar();
  }

  async function marcarAlta(id: string, enviado: boolean) {
    await fetch(`/api/internaciones/${id}/alta-enviada`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enviado }) });
    await cargar();
  }

  if (!activas) return <p className="text-sm text-humo-500">Cargando internados...</p>;

  return (
    <div className="flex flex-col gap-5">
      {esVeterinario && (
        <p className="text-xs text-humo-500">Para internar a una mascota, entrá a su ficha (Clientes) y tocá “Internar”.</p>
      )}

      {altas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-exito-600">Altas para avisar ({altas.length})</h2>
          {altas.map((a) => {
            const wa = linkWhatsApp(a.mascota.tutor.telefono, mensajeAlta(a, negocio));
            return (
              <div key={a.id} className="card-suave flex flex-col gap-2 rounded-xl border border-exito-500/30 bg-white p-4 text-sm">
                <p className="font-medium text-humo-900">
                  {a.mascota.nombre} · {a.mascota.tutor.nombre} <span className="font-normal text-humo-400">· alta el {fechaHoraAR(a.egresoEn)}</span>
                </p>
                <p className="whitespace-pre-line text-humo-600">{a.indicacionesAlta}</p>
                <div className="flex flex-wrap gap-2">
                  {wa ? (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary rounded-md px-3 py-1.5 text-xs">
                      Enviar indicaciones por WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs text-alerta-600">El teléfono no parece un celular.</span>
                  )}
                  <button onClick={() => marcarAlta(a.id, true)} className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium">
                    ✓ Ya lo envié
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-humo-900">Internados ahora ({activas.length})</h2>
        {activas.length === 0 && <p className="text-sm text-humo-500">No hay mascotas internadas.</p>}
        {activas.map((i) => {
          const ultimo = i.partes[0];
          const sinEnviar = i.partes.filter((p) => !p.enviadoEn).length;
          const wa = ultimo ? linkWhatsApp(i.mascota.tutor.telefono, mensajeParte(i, ultimo, negocio)) : null;
          return (
            <div key={i.id} className="card-suave flex flex-col gap-2 rounded-xl border border-humo-100 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-semibold text-humo-900">
                    {i.mascota.nombre}
                    {i.mascota.especie && <span className="text-sm font-normal text-humo-400"> · {i.mascota.especie}</span>}
                  </p>
                  <p className="text-humo-600">
                    {i.mascota.tutor.nombre} · <span className="tabular-nums">{i.mascota.tutor.telefono}</span>
                  </p>
                  <p className="text-xs text-humo-400">
                    {diasInternado(i.ingresoEn)} · a cargo de {i.veterinario}
                    {esVeterinario && ` · ${i.motivo}`}
                  </p>
                </div>
                {ultimo && (
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${COLOR_ESTADO[ultimo.estado]}`}>
                    {ESTADO_PARTE[ultimo.estado].emoji} {ESTADO_PARTE[ultimo.estado].texto}
                  </span>
                )}
              </div>

              {ultimo ? (
                <div className="rounded-lg bg-humo-50 p-3">
                  <p className="mb-1 flex flex-wrap items-center gap-2 text-xs text-humo-500">
                    Último parte · {fechaHoraAR(ultimo.createdAt)} · {ultimo.autor}
                    {ultimo.enviadoEn ? (
                      <span className="rounded-full bg-exito-50 px-2 py-0.5 text-exito-600">
                        ✓ Enviado {fechaHoraAR(ultimo.enviadoEn)}
                        {ultimo.enviadoPor && ` por ${ultimo.enviadoPor}`}
                      </span>
                    ) : (
                      <span className="rounded-full bg-alerta-50 px-2 py-0.5 font-medium text-alerta-600">Parte nuevo sin enviar</span>
                    )}
                  </p>
                  <p className="whitespace-pre-line text-humo-800">{ultimo.parteFamilia}</p>
                </div>
              ) : (
                <p className="text-xs text-humo-400">Todavía no hay partes.</p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {ultimo && wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${ultimo.enviadoEn ? "btn-secondary font-medium" : "btn-primary"} rounded-md px-3 py-1.5 text-xs`}
                  >
                    {ultimo.enviadoEn ? "Volver a enviar por WhatsApp" : "Enviar parte por WhatsApp"}
                  </a>
                )}
                {ultimo && !wa && <span className="text-xs text-alerta-600">El teléfono no parece un celular.</span>}
                {ultimo &&
                  (ultimo.enviadoEn ? (
                    <button onClick={() => marcarParte(i.id, ultimo.id, false)} className="text-xs text-humo-400 hover:text-humo-700">
                      Desmarcar
                    </button>
                  ) : (
                    <button onClick={() => marcarParte(i.id, ultimo.id, true)} className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium">
                      ✓ Ya lo envié
                    </button>
                  ))}
                {sinEnviar > 1 && <span className="text-xs text-humo-400">({sinEnviar - 1} partes anteriores sin marcar)</span>}
                {esVeterinario && (
                  <Link href={`/admin/internaciones/${i.id}`} className="ml-auto text-xs font-medium text-[var(--color-primario)] hover:underline">
                    Abrir internación →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
