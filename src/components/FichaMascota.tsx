"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HistorialTurnos, { type TurnoHistorial } from "@/components/HistorialTurnos";
import HistoriaClinica from "@/components/HistoriaClinica";
import PlanSanitario from "@/components/PlanSanitario";
import InternacionMascota from "@/components/InternacionMascota";
import { calcularEdad, formatearFecha } from "@/lib/formatoFichas";
import { getFechaHoyArgentina } from "@/lib/disponibilidad";

interface Mascota {
  id: string;
  nombre: string;
  especie: string | null;
  raza: string | null;
  sexo: string | null;
  castrado: boolean | null;
  fechaNacimiento: string | null;
  color: string | null;
  microchip: string | null;
  pesoKg: number | null;
  alertas: string | null;
  notas: string | null;
  fallecida: boolean;
  tutor: { id: string; nombre: string; telefono: string; mascotas: { id: string; nombre: string }[] };
  turnos: TurnoHistorial[];
}

interface FormMascota {
  nombre: string;
  especie: string;
  raza: string;
  sexo: string;
  castrado: string; // "si" | "no" | ""
  fechaNacimiento: string;
  color: string;
  microchip: string;
  pesoKg: string;
  alertas: string;
  notas: string;
  fallecida: boolean;
}

const INPUT =
  "rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100";

function formDesde(m: Mascota): FormMascota {
  return {
    nombre: m.nombre,
    especie: m.especie ?? "",
    raza: m.raza ?? "",
    sexo: m.sexo ?? "",
    castrado: m.castrado == null ? "" : m.castrado ? "si" : "no",
    fechaNacimiento: m.fechaNacimiento ?? "",
    color: m.color ?? "",
    microchip: m.microchip ?? "",
    pesoKg: m.pesoKg != null ? String(m.pesoKg) : "",
    alertas: m.alertas ?? "",
    notas: m.notas ?? "",
    fallecida: m.fallecida,
  };
}

export default function FichaMascota({
  id,
  puedeVerHistoria,
  turnoParaConsulta,
  usuarioNombre = "",
}: {
  id: string;
  puedeVerHistoria: boolean;
  turnoParaConsulta: string | null;
  usuarioNombre?: string;
}) {
  const router = useRouter();
  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [form, setForm] = useState<FormMascota | null>(null);
  const [unirCon, setUnirCon] = useState<string | null>(null);
  const [versionVacunas, setVersionVacunas] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/mascotas/${id}`);
    if (!res.ok) {
      setNoEncontrada(true);
      return;
    }
    const data = await res.json();
    setMascota(data.mascota);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar.
    cargar();
  }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    const payload = {
      nombre: form.nombre,
      especie: form.especie,
      raza: form.raza,
      sexo: form.sexo || null,
      castrado: form.castrado === "" ? null : form.castrado === "si",
      fechaNacimiento: form.fechaNacimiento || null,
      color: form.color,
      microchip: form.microchip,
      pesoKg: form.pesoKg ? Number(form.pesoKg.replace(",", ".")) : null,
      alertas: form.alertas,
      notas: form.notas,
      fallecida: form.fallecida,
    };
    const res = await fetch(`/api/mascotas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar");
      return;
    }
    setForm(null);
    await cargar();
  }

  async function unir() {
    if (!unirCon || !mascota) return;
    const destino = mascota.tutor.mascotas.find((m) => m.id === unirCon);
    const ok = window.confirm(
      `Se van a pasar los turnos de "${mascota.nombre}" a "${destino?.nombre}" y esta ficha se va a eliminar. ¿Seguimos?`
    );
    if (!ok) return;
    setError(null);
    const res = await fetch(`/api/mascotas/${id}/unir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinoId: unirCon }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudieron unir las fichas");
      return;
    }
    router.replace(`/admin/mascotas/${data.mascotaId}`);
  }

  if (noEncontrada) return <p className="text-sm text-humo-500">No se encontró esta mascota.</p>;
  if (!mascota) return <p className="text-sm text-humo-500">Cargando ficha...</p>;

  const edad = mascota.fechaNacimiento && !mascota.fallecida ? calcularEdad(mascota.fechaNacimiento, getFechaHoyArgentina()) : null;
  const otrasMascotas = mascota.tutor.mascotas.filter((m) => m.id !== mascota.id);
  // Si se llegó desde "Cargar consulta" en la agenda, el formulario arranca con la fecha
  // y el servicio de ese turno.
  const turnoOrigen = turnoParaConsulta ? mascota.turnos.find((t) => t.id === turnoParaConsulta) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/admin/clientes/${mascota.tutor.id}`} className="w-fit text-sm text-humo-500 hover:text-humo-800">
        ← {mascota.tutor.nombre}
      </Link>

      {error && <div className="rounded-xl bg-peligro-50 px-4 py-2 text-sm text-peligro-600">{error}</div>}

      <InternacionMascota mascotaId={mascota.id} puedeInternar={puedeVerHistoria} usuarioNombre={usuarioNombre} fallecida={mascota.fallecida} />

      {mascota.alertas && (
        <div className="rounded-xl border border-peligro-500/30 bg-peligro-50 px-4 py-3 text-sm text-peligro-600">
          <p className="font-semibold">⚠️ Alertas</p>
          <p className="whitespace-pre-line">{mascota.alertas}</p>
        </div>
      )}

      {!form ? (
        <section className="card-suave flex flex-col gap-3 rounded-xl border border-humo-100 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="font-display text-xl font-semibold text-humo-900">
                {mascota.nombre}
                {mascota.fallecida && <span className="ml-2 text-sm font-normal text-humo-400">falleció</span>}
              </h1>
              <p className="text-sm text-humo-600">
                {[mascota.especie, mascota.raza].filter(Boolean).join(" · ") || "Especie sin cargar"}
              </p>
            </div>
            <button
              onClick={() => {
                setForm(formDesde(mascota));
                setError(null);
              }}
              className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
            >
              Editar reseña
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <Dato etiqueta="Sexo" valor={mascota.sexo} />
            <Dato
              etiqueta="Castrado/a"
              valor={mascota.castrado == null ? null : mascota.castrado ? "Sí" : "No"}
            />
            <Dato
              etiqueta="Nacimiento"
              valor={mascota.fechaNacimiento ? `${formatearFecha(mascota.fechaNacimiento)}${edad ? ` (${edad})` : ""}` : null}
            />
            <Dato etiqueta="Peso" valor={mascota.pesoKg != null ? `${mascota.pesoKg.toLocaleString("es-AR")} kg` : null} />
            <Dato etiqueta="Color / pelaje" valor={mascota.color} />
            <Dato etiqueta="Microchip" valor={mascota.microchip} />
          </dl>
          {mascota.notas && <p className="whitespace-pre-line text-sm text-humo-600">{mascota.notas}</p>}
        </section>
      ) : (
        <form onSubmit={guardar} className="flex flex-col gap-3 rounded-xl border border-humo-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Nombre">
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={INPUT} />
            </Campo>
            <Campo etiqueta="Especie">
              <input
                list="especies"
                value={form.especie}
                onChange={(e) => setForm({ ...form, especie: e.target.value })}
                className={INPUT}
              />
              <datalist id="especies">
                <option value="Perro" />
                <option value="Gato" />
              </datalist>
            </Campo>
            <Campo etiqueta="Raza">
              <input value={form.raza} onChange={(e) => setForm({ ...form, raza: e.target.value })} className={INPUT} />
            </Campo>
            <Campo etiqueta="Sexo">
              <select value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })} className={`${INPUT} bg-white`}>
                <option value="">Sin dato</option>
                <option value="Macho">Macho</option>
                <option value="Hembra">Hembra</option>
              </select>
            </Campo>
            <Campo etiqueta="Castrado/a">
              <select value={form.castrado} onChange={(e) => setForm({ ...form, castrado: e.target.value })} className={`${INPUT} bg-white`}>
                <option value="">Sin dato</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </Campo>
            <Campo etiqueta="Fecha de nacimiento (aproximada si no se sabe)">
              <input
                type="date"
                value={form.fechaNacimiento}
                onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Peso (kg)">
              <input
                inputMode="decimal"
                value={form.pesoKg}
                onChange={(e) => setForm({ ...form, pesoKg: e.target.value })}
                placeholder="Ej: 12,5"
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Color / pelaje">
              <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className={INPUT} />
            </Campo>
            <Campo etiqueta="Microchip">
              <input value={form.microchip} onChange={(e) => setForm({ ...form, microchip: e.target.value })} className={INPUT} />
            </Campo>
          </div>
          <Campo etiqueta="Alertas (alergias, reacciones a medicamentos, muerde, etc.)">
            <textarea rows={2} value={form.alertas} onChange={(e) => setForm({ ...form, alertas: e.target.value })} className={INPUT} />
          </Campo>
          <Campo etiqueta="Notas">
            <textarea rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className={INPUT} />
          </Campo>
          <label className="flex items-center gap-2 text-sm text-humo-700">
            <input type="checkbox" checked={form.fallecida} onChange={(e) => setForm({ ...form, fallecida: e.target.checked })} />
            Falleció
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm">
              Guardar
            </button>
            <button type="button" onClick={() => setForm(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <PlanSanitario mascotaId={mascota.id} puedeRegistrar={puedeVerHistoria} recargar={versionVacunas} />

      {puedeVerHistoria && (
        <HistoriaClinica
          mascotaId={mascota.id}
          especie={mascota.especie}
          turnoInicial={turnoOrigen ? { id: turnoOrigen.id, fecha: turnoOrigen.fecha, motivo: turnoOrigen.servicio.nombre } : null}
          onGuardado={() => {
            cargar();
            setVersionVacunas((v) => v + 1);
          }}
        />
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-humo-900">Turnos</h2>
        <HistorialTurnos turnos={mascota.turnos} />
      </section>

      {otrasMascotas.length > 0 && (
        <section className="flex flex-col gap-2 rounded-xl border border-dashed border-humo-200 p-4">
          <h2 className="text-sm font-semibold text-humo-700">¿Es la misma mascota cargada dos veces?</h2>
          <p className="text-xs text-humo-500">
            Si en algún turno se escribió distinto el nombre (por ejemplo &quot;Floppy&quot; y &quot;Flopy&quot;), podés unir
            las dos fichas: los turnos de esta pasan a la otra y esta se elimina.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={unirCon ?? ""}
              onChange={(e) => setUnirCon(e.target.value || null)}
              className={`${INPUT} bg-white text-sm`}
            >
              <option value="">Elegí la otra mascota...</option>
              {otrasMascotas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!unirCon}
              onClick={unir}
              className="btn-secondary rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50"
            >
              Unir con otra mascota
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-humo-600">{etiqueta}</span>
      {children}
    </label>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-xs text-humo-400">{etiqueta}</dt>
      <dd className={valor ? "text-humo-700" : "text-humo-300"}>{valor ?? "—"}</dd>
    </div>
  );
}
