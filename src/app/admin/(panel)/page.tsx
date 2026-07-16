import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getFechaHoyArgentina, sumarDias } from "@/lib/disponibilidad";
import BotonNuevoTurnoDashboard from "@/components/BotonNuevoTurnoDashboard";

export const dynamic = "force-dynamic";

const ESTADOS_ACTIVOS = ["PENDIENTE", "CONFIRMADO"] as const;

const ESTADO_PILL: Record<string, string> = {
  PENDIENTE: "bg-alerta-50 text-alerta-600",
  CONFIRMADO: "bg-exito-50 text-exito-600",
};

const ESTADO_DOT: Record<string, string> = {
  PENDIENTE: "bg-alerta-500",
  CONFIRMADO: "bg-exito-500",
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
};

export default async function DashboardPage() {
  const hoy = getFechaHoyArgentina();
  const en7dias = sumarDias(hoy, 6);

  const [turnosHoyCount, turnosSemana, clientesActivos, proximosTurnos] = await Promise.all([
    prisma.turno.count({
      where: { fecha: hoy, estado: { in: [...ESTADOS_ACTIVOS] } },
    }),
    prisma.turno.count({
      where: { fecha: { gte: hoy, lte: en7dias }, estado: { in: [...ESTADOS_ACTIVOS] } },
    }),
    prisma.turno.groupBy({
      by: ["clienteTelefono"],
      where: { estado: { in: [...ESTADOS_ACTIVOS, "COMPLETADO"] } },
    }),
    prisma.turno.findMany({
      where: { fecha: { gte: hoy }, estado: { in: [...ESTADOS_ACTIVOS] } },
      include: { servicio: true },
      orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
      take: 6,
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card-suave flex items-center gap-3 rounded-2xl border border-humo-100 bg-white p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mora-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7b2d8e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="17" rx="3" />
              <path d="M3 9h18" />
              <path d="M8 2v4M16 2v4" />
              <circle cx="8.5" cy="14" r="1.2" fill="#7b2d8e" stroke="none" />
              <circle cx="12" cy="14" r="1.2" fill="#7b2d8e" stroke="none" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-humo-500">Turnos hoy</p>
            <p className="font-display text-3xl font-semibold tabular-nums text-[var(--color-primario)]">
              {turnosHoyCount}
            </p>
          </div>
        </div>
        <div className="card-suave flex items-center gap-3 rounded-2xl border border-humo-100 bg-white p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-celeste-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1c8fc7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M15 7h6v6" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-humo-500">Próximos 7 días</p>
            <p className="font-display text-3xl font-semibold tabular-nums text-[var(--color-secundario)]">
              {turnosSemana}
            </p>
          </div>
        </div>
        <div className="card-suave col-span-2 flex items-center gap-3 rounded-2xl border border-humo-100 bg-white p-4 sm:col-span-1">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-humo-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-primario)" stroke="none">
              <ellipse cx="12" cy="15.5" rx="5" ry="4.2" />
              <ellipse cx="4.8" cy="10.2" rx="2.1" ry="2.6" transform="rotate(-18 4.8 10.2)" />
              <ellipse cx="9.3" cy="5.6" rx="2.1" ry="2.7" transform="rotate(-8 9.3 5.6)" />
              <ellipse cx="14.9" cy="5.6" rx="2.1" ry="2.7" transform="rotate(8 14.9 5.6)" />
              <ellipse cx="19.2" cy="10.2" rx="2.1" ry="2.6" transform="rotate(18 19.2 10.2)" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-humo-500">Clientes activos</p>
            <p className="font-display text-3xl font-semibold tabular-nums text-humo-800">
              {clientesActivos.length}
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display font-semibold text-humo-900">Próximos turnos</h2>
          <div className="flex items-center gap-3">
            <Link href="/admin/turnos" className="btn-ghost text-sm font-medium">
              Ver todos →
            </Link>
            <BotonNuevoTurnoDashboard />
          </div>
        </div>
        {proximosTurnos.length === 0 ? (
          <p className="text-sm text-humo-500">No hay turnos próximos cargados.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {proximosTurnos.map((t) => (
              <li
                key={t.id}
                className="card-suave flex items-center justify-between gap-3 rounded-xl border border-humo-100 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${ESTADO_DOT[t.estado]}`} />
                  <div>
                    <p className="font-medium text-humo-900">
                      {t.mascotaNombre} <span className="font-normal text-humo-500">· {t.servicio.nombre}</span>
                    </p>
                    <p className="text-sm text-humo-500">
                      {t.fecha === hoy ? "Hoy" : t.fecha}, <span className="tabular-nums">{t.horaInicio}</span>
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_PILL[t.estado]}`}>
                  {ESTADO_LABEL[t.estado]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
