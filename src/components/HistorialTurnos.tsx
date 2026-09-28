import { ESTADO_BADGE, ESTADO_LABEL } from "@/lib/estadosTurno";
import { formatearFecha } from "@/lib/formatoFichas";

export interface TurnoHistorial {
  id: string;
  fecha: string;
  horaInicio: string;
  estado: string;
  mascotaNombre: string;
  notas: string | null;
  servicio: { nombre: string };
}

/** Lista de turnos (más recientes primero) para las fichas de cliente y de mascota. */
export default function HistorialTurnos({
  turnos,
  mostrarMascota = false,
}: {
  turnos: TurnoHistorial[];
  mostrarMascota?: boolean;
}) {
  if (turnos.length === 0) return <p className="text-sm text-humo-500">Todavía no tiene turnos.</p>;

  return (
    <ul className="flex flex-col divide-y divide-humo-100 rounded-xl border border-humo-100 bg-white">
      {turnos.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <div className="text-sm">
            <p className="text-humo-900">
              <span className="tabular-nums">
                {formatearFecha(t.fecha)} · {t.horaInicio}
              </span>{" "}
              · {t.servicio.nombre}
              {mostrarMascota && t.mascotaNombre && <span className="text-humo-500"> · {t.mascotaNombre}</span>}
            </p>
            {t.notas && <p className="text-xs text-humo-400">Notas: {t.notas}</p>}
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[t.estado]}`}>
            {ESTADO_LABEL[t.estado]}
          </span>
        </li>
      ))}
    </ul>
  );
}
