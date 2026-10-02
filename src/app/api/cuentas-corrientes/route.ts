import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/autorizacion";

// GET: clientes con saldo de cuenta corriente distinto de 0 (deben o tienen saldo a favor).
export async function GET() {
  const session = await auth();
  if (!tienePermiso(session, "ventas")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const saldos = await prisma.$queryRaw<{ id: string; nombre: string; telefono: string; saldo: number }[]>`
    SELECT t.id, t.nombre, t.telefono,
      (COALESCE(v.pendiente, 0) - COALESCE(p.pagado, 0))::int AS saldo
    FROM "Tutor" t
    LEFT JOIN (
      SELECT "tutorId", SUM(total - pagado) AS pendiente FROM "Venta"
      WHERE estado = 'ACTIVA' AND "tutorId" IS NOT NULL GROUP BY "tutorId"
    ) v ON v."tutorId" = t.id
    LEFT JOIN (
      SELECT "tutorId", SUM(monto) AS pagado FROM "PagoCuentaCorriente" GROUP BY "tutorId"
    ) p ON p."tutorId" = t.id
    WHERE COALESCE(v.pendiente, 0) - COALESCE(p.pagado, 0) <> 0
    ORDER BY saldo DESC`;
  return NextResponse.json({ saldos });
}
