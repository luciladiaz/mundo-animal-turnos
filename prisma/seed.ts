import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Configuración del negocio ──────────────────────────────────────
  // Colores tomados del logo real de Mundo Animal (violeta + azul).
  const configExistente = await prisma.configuracionNegocio.findFirst();
  if (!configExistente) {
    await prisma.configuracionNegocio.create({
      data: {
        nombre: "Mundo Animal",
        colorPrimario: "#7B2D8E", // violeta del logo
        colorSecundario: "#1C8FC7", // azul del logo
        direccion: "[Completar dirección real]",
        telefono: "[Completar teléfono real]",
        bufferMinutos: 10,
      },
    });
    console.log("✓ ConfiguracionNegocio creada (Mundo Animal, colores de marca reales)");
  }

  // ── Servicios de ejemplo ────────────────────────────────────────────
  const serviciosEjemplo = [
    { nombre: "Consulta general", duracionMinutos: 30, precio: 8000 },
    { nombre: "Vacunación", duracionMinutos: 20, precio: 6000 },
    { nombre: "Desparasitación", duracionMinutos: 15, precio: 4000 },
    { nombre: "Baño y peluquería", duracionMinutos: 60, precio: 12000 },
    { nombre: "Cirugía menor", duracionMinutos: 90, precio: 25000 },
  ];
  for (const s of serviciosEjemplo) {
    const existe = await prisma.servicio.findFirst({ where: { nombre: s.nombre } });
    if (!existe) {
      await prisma.servicio.create({ data: s });
    }
  }
  console.log(`✓ ${serviciosEjemplo.length} servicios de ejemplo verificados/creados`);

  // ── Horario de atención de ejemplo ──────────────────────────────────
  // Lunes a viernes 09:00-13:00 y 15:00-19:00, sábados 09:00-13:00, domingo cerrado.
  const bloquesExistentes = await prisma.horarioBloque.count();
  if (bloquesExistentes === 0) {
    const diasHabiles = [1, 2, 3, 4, 5]; // lunes a viernes
    const bloques = [
      ...diasHabiles.flatMap((dia) => [
        { diaSemana: dia, horaInicio: "09:00", horaFin: "13:00" },
        { diaSemana: dia, horaInicio: "15:00", horaFin: "19:00" },
      ]),
      { diaSemana: 6, horaInicio: "09:00", horaFin: "13:00" }, // sábado
    ];
    await prisma.horarioBloque.createMany({ data: bloques });
    console.log(`✓ ${bloques.length} bloques de horario de ejemplo creados (lun-vie + sáb)`);
  }

  // ── Usuario admin ────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("Faltan ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD en el .env");
  }
  const adminExistente = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  if (!adminExistente) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.adminUser.create({
      data: { nombre: "Administrador", email: adminEmail, passwordHash, rol: "admin", activo: true },
    });
    console.log(`✓ Usuario admin creado: ${adminEmail}`);
  } else {
    console.log(`✓ Usuario admin ya existía: ${adminEmail}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
