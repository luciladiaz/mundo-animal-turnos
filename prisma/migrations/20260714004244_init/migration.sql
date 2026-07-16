-- CreateTable
CREATE TABLE "Servicio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "duracionMinutos" INTEGER NOT NULL,
    "precio" REAL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ConfiguracionNegocio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "logoUrl" TEXT,
    "colorPrimario" TEXT NOT NULL DEFAULT '#0F766E',
    "colorSecundario" TEXT NOT NULL DEFAULT '#F59E0B',
    "direccion" TEXT,
    "telefono" TEXT,
    "bufferMinutos" INTEGER NOT NULL DEFAULT 10
);

-- CreateTable
CREATE TABLE "HorarioBloque" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "servicioId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "clienteTelefono" TEXT NOT NULL,
    "clienteEmail" TEXT,
    "mascotaNombre" TEXT NOT NULL,
    "mascotaEspecie" TEXT,
    "notas" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'CONFIRMADO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Turno_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'admin'
);

-- CreateIndex
CREATE INDEX "HorarioBloque_diaSemana_idx" ON "HorarioBloque"("diaSemana");

-- CreateIndex
CREATE INDEX "Turno_fecha_idx" ON "Turno"("fecha");

-- CreateIndex
CREATE INDEX "Turno_servicioId_fecha_idx" ON "Turno"("servicioId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
