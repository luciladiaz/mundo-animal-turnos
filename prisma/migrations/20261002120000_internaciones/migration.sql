-- CreateEnum
CREATE TYPE "EstadoInternacion" AS ENUM ('INTERNADA', 'ALTA', 'DERIVADA', 'FALLECIDA');

-- CreateEnum
CREATE TYPE "EstadoParte" AS ENUM ('ESTABLE', 'OBSERVACION', 'DELICADO');

-- CreateTable
CREATE TABLE "Internacion" (
    "id" TEXT NOT NULL,
    "mascotaId" TEXT NOT NULL,
    "estado" "EstadoInternacion" NOT NULL DEFAULT 'INTERNADA',
    "ingresoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT NOT NULL,
    "diagnostico" TEXT,
    "veterinario" TEXT NOT NULL,
    "creadaPor" TEXT NOT NULL,
    "egresoEn" TIMESTAMP(3),
    "egresoPor" TEXT,
    "notaEgreso" TEXT,
    "indicacionesAlta" TEXT,
    "altaEnviadaEn" TIMESTAMP(3),
    "altaEnviadaPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Internacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParteInternacion" (
    "id" TEXT NOT NULL,
    "internacionId" TEXT NOT NULL,
    "estado" "EstadoParte" NOT NULL,
    "parteFamilia" TEXT NOT NULL,
    "notaClinica" TEXT,
    "autor" TEXT NOT NULL,
    "enviadoEn" TIMESTAMP(3),
    "enviadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParteInternacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicacionInternacion" (
    "id" TEXT NOT NULL,
    "internacionId" TEXT NOT NULL,
    "medicamento" TEXT NOT NULL,
    "dosis" TEXT NOT NULL,
    "via" TEXT,
    "frecuenciaHoras" INTEGER,
    "indicaciones" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadaPor" TEXT NOT NULL,
    "suspendidaEn" TIMESTAMP(3),
    "suspendidaPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicacionInternacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TomaMedicacion" (
    "id" TEXT NOT NULL,
    "medicacionId" TEXT NOT NULL,
    "administradaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "administradaPor" TEXT NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "TomaMedicacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Internacion_estado_idx" ON "Internacion"("estado");

-- CreateIndex
CREATE INDEX "Internacion_mascotaId_idx" ON "Internacion"("mascotaId");

-- CreateIndex
CREATE INDEX "ParteInternacion_internacionId_createdAt_idx" ON "ParteInternacion"("internacionId", "createdAt");

-- CreateIndex
CREATE INDEX "MedicacionInternacion_internacionId_idx" ON "MedicacionInternacion"("internacionId");

-- CreateIndex
CREATE INDEX "TomaMedicacion_medicacionId_administradaEn_idx" ON "TomaMedicacion"("medicacionId", "administradaEn");

-- AddForeignKey
ALTER TABLE "Internacion" ADD CONSTRAINT "Internacion_mascotaId_fkey" FOREIGN KEY ("mascotaId") REFERENCES "Mascota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParteInternacion" ADD CONSTRAINT "ParteInternacion_internacionId_fkey" FOREIGN KEY ("internacionId") REFERENCES "Internacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicacionInternacion" ADD CONSTRAINT "MedicacionInternacion_internacionId_fkey" FOREIGN KEY ("internacionId") REFERENCES "Internacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TomaMedicacion" ADD CONSTRAINT "TomaMedicacion_medicacionId_fkey" FOREIGN KEY ("medicacionId") REFERENCES "MedicacionInternacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================================
-- Agregado a mano
-- ============================================================================

-- Una sola internación activa por mascota.
CREATE UNIQUE INDEX "Internacion_una_activa_por_mascota" ON "Internacion" ("mascotaId") WHERE "estado" = 'INTERNADA';

-- Seguridad: toda tabla nueva con RLS (ver 20260929120000_activar_rls).
ALTER TABLE "Internacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParteInternacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedicacionInternacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TomaMedicacion" ENABLE ROW LEVEL SECURITY;
