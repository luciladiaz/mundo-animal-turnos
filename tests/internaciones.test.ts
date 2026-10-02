/**
 * Pruebas de internaciones contra un Postgres REAL de pruebas (ver circuito-ventas.test.ts).
 *   TEST_DATABASE_URL="postgresql://postgres:prueba@localhost:54329/pruebas" npm run test:internaciones
 */
import { PrismaClient } from "@prisma/client";
import { agregarMedicacion, agregarParte, darEgreso, internar, proximaToma, registrarToma, suspenderMedicacion } from "../src/lib/internaciones";
import { ErrorNegocio } from "../src/lib/errorNegocio";

const url = process.env.TEST_DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("TEST_DATABASE_URL tiene que apuntar a un Postgres LOCAL de pruebas.");
  process.exit(1);
}
const db = new PrismaClient({ datasourceUrl: url });
const U = "Vet Prueba";
let pasadas = 0;
let fallas = 0;
function ok(c: unknown, d: string) {
  if (c) {
    pasadas++;
    console.log(`  ✓ ${d}`);
  } else {
    fallas++;
    console.log(`  ✗ ${d}`);
  }
}
async function falla(p: Promise<unknown>, contiene: string, d: string) {
  try {
    await p;
    ok(false, `${d} (no dio error)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ok(e instanceof ErrorNegocio && msg.includes(contiene), `${d} → "${msg}"`);
  }
}

async function main() {
  await db.$executeRawUnsafe(`TRUNCATE "TomaMedicacion","MedicacionInternacion","ParteInternacion","Internacion" CASCADE`);
  const tutor = await db.tutor.create({ data: { nombre: "Tutor Prueba", telefono: "2990000001", telefonoClave: `i${Date.now()}`.slice(-10) } });
  const luna = await db.mascota.create({ data: { tutorId: tutor.id, nombre: "Luna", nombreClave: "luna", especie: "Perro" } });
  const toby = await db.mascota.create({ data: { tutorId: tutor.id, nombre: "Toby", nombreClave: "toby", especie: "Gato" } });

  console.log("1. Internar");
  const i1 = await internar(db, { mascotaId: luna.id, motivo: "Gastroenteritis", veterinario: "Dra. Prueba", ingresoEn: "2026-10-02T09:30" }, U);
  ok(i1.estado === "INTERNADA", "Luna internada");
  ok(i1.ingresoEn.toISOString() === "2026-10-02T12:30:00.000Z", "La hora de ingreso se toma como hora argentina (09:30 AR = 12:30 UTC)");
  await falla(internar(db, { mascotaId: luna.id, motivo: "x", veterinario: "y" }, U), "ya está internada", "No se puede internar dos veces a la misma mascota");
  const dobles = await Promise.allSettled([
    internar(db, { mascotaId: toby.id, motivo: "a", veterinario: "y" }, U),
    internar(db, { mascotaId: toby.id, motivo: "b", veterinario: "y" }, U),
  ]);
  ok(dobles.filter((r) => r.status === "fulfilled").length === 1, "Dos internaciones simultáneas de Toby: queda una sola");

  console.log("\n2. Partes");
  const p1 = await agregarParte(db, i1.id, { estado: "OBSERVACION", parteFamilia: "Comió un poquito", notaClinica: "T 39,4 °C" }, U);
  ok(p1.parteFamilia === "Comió un poquito" && p1.notaClinica === "T 39,4 °C" && p1.enviadoEn === null, "Parte con texto para la familia y nota clínica, sin enviar");

  console.log("\n3. Hoja de medicación");
  const m1 = await agregarMedicacion(db, i1.id, { medicamento: "Metronidazol", dosis: "250 mg", via: "Oral", frecuenciaHoras: 12, indicaciones: null }, U);
  const t1 = await registrarToma(db, m1.id, null, U);
  const prox = proximaToma(m1, t1.administradaEn)!;
  ok(prox.getTime() - t1.administradaEn.getTime() === 12 * 3600 * 1000, "Próxima toma = última + 12 horas");
  ok(proximaToma({ ...m1, frecuenciaHoras: null }, t1.administradaEn) === null, "\"Según necesidad\" no calcula próxima toma");
  await suspenderMedicacion(db, m1.id, U);
  await falla(registrarToma(db, m1.id, null, U), "suspendida", "No se puede dar una medicación suspendida");
  const m2 = await agregarMedicacion(db, i1.id, { medicamento: "Suero", dosis: "500 ml", via: null, frecuenciaHoras: 24, indicaciones: null }, U);

  console.log("\n4. Egreso");
  await falla(darEgreso(db, i1.id, { tipo: "ALTA", indicacionesAlta: null, notaEgreso: null }, U), "indicaciones", "Alta sin indicaciones para la casa: rechazada");
  await darEgreso(db, i1.id, { tipo: "ALTA", indicacionesAlta: "Dieta blanda 3 días", notaEgreso: "Evolución favorable" }, U);
  const fin = await db.internacion.findUniqueOrThrow({ where: { id: i1.id } });
  ok(fin.estado === "ALTA" && fin.egresoEn && fin.indicacionesAlta === "Dieta blanda 3 días", "Alta registrada con indicaciones");
  ok(!(await db.medicacionInternacion.findUniqueOrThrow({ where: { id: m2.id } })).activa, "Al dar el alta se suspende la medicación activa");
  await falla(agregarParte(db, i1.id, { estado: "ESTABLE", parteFamilia: "x", notaClinica: null }, U), "ya terminó", "No se cargan partes después del alta");
  const i2 = await internar(db, { mascotaId: luna.id, motivo: "Control", veterinario: "Dra. Prueba" }, U);
  ok(i2.estado === "INTERNADA", "Después del alta se la puede volver a internar");

  const tobyInternacion = await db.internacion.findFirstOrThrow({ where: { mascotaId: toby.id, estado: "INTERNADA" } });
  await darEgreso(db, tobyInternacion.id, { tipo: "FALLECIDA", indicacionesAlta: null, notaEgreso: "Paro cardiorrespiratorio" }, U);
  ok((await db.mascota.findUniqueOrThrow({ where: { id: toby.id } })).fallecida, "Fallecimiento: la ficha queda marcada como fallecida");
  await falla(internar(db, { mascotaId: toby.id, motivo: "x", veterinario: "y" }, U), "fallecida", "No se puede internar una mascota fallecida");

  console.log(`\nResultado: ${pasadas} pruebas OK, ${fallas} fallas`);
  await db.$disconnect();
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
