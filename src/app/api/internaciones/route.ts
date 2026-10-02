import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { puedeVerInternados, tienePermiso } from "@/lib/autorizacion";
import { nombreUsuario } from "@/lib/consultas";
import { internar, internarSchema } from "@/lib/internaciones";
import { respuestaDeError } from "@/lib/errorNegocio";

const mascotaSelect = {
  id: true,
  nombre: true,
  especie: true,
  tutor: { select: { id: true, nombre: true, telefono: true } },
} as const;

/**
 * GET: internaciones activas (con el último parte para la familia) y altas recientes
 * pendientes de avisar. Con ?mascotaId= devuelve las internaciones de esa mascota.
 * La nota clínica NUNCA sale de acá: solo la ve el veterinario en /api/internaciones/[id].
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!puedeVerInternados(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const mascotaId = new URL(req.url).searchParams.get("mascotaId");
  if (mascotaId) {
    const internaciones = await prisma.internacion.findMany({
      where: { mascotaId },
      select: { id: true, estado: true, ingresoEn: true, egresoEn: true, motivo: true },
      orderBy: { ingresoEn: "desc" },
    });
    return NextResponse.json({ internaciones });
  }

  const parteSelect = { id: true, estado: true, parteFamilia: true, autor: true, enviadoEn: true, enviadoPor: true, createdAt: true } as const;
  const [activas, altas] = await Promise.all([
    prisma.internacion.findMany({
      where: { estado: "INTERNADA" },
      select: {
        id: true,
        ingresoEn: true,
        motivo: true,
        veterinario: true,
        mascota: { select: mascotaSelect },
        partes: { select: parteSelect, orderBy: { createdAt: "desc" } },
      },
      orderBy: { ingresoEn: "asc" },
    }),
    prisma.internacion.findMany({
      where: { estado: "ALTA", altaEnviadaEn: null, egresoEn: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      select: { id: true, egresoEn: true, indicacionesAlta: true, mascota: { select: mascotaSelect } },
      orderBy: { egresoEn: "desc" },
    }),
  ]);
  const configuracion = await prisma.configuracionNegocio.findFirst({ select: { nombre: true } });
  return NextResponse.json({
    activas,
    altas,
    negocio: configuracion?.nombre ?? "la veterinaria",
    esVeterinario: tienePermiso(session, "historia"),
  });
}

// POST: internar a una mascota (solo veterinario).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!tienePermiso(session, "historia")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const parsed = internarSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  try {
    const internacion = await internar(prisma, parsed.data, nombreUsuario(session));
    return NextResponse.json({ internacion }, { status: 201 });
  } catch (err) {
    return respuestaDeError(err);
  }
}
