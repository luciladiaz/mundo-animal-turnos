-- CreateEnum
CREATE TYPE "TipoAplicacion" AS ENUM ('VACUNA', 'DESPARASITACION_INTERNA', 'DESPARASITACION_EXTERNA');

-- CreateTable
CREATE TABLE "Aplicacion" (
    "id" TEXT NOT NULL,
    "mascotaId" TEXT NOT NULL,
    "consultaId" TEXT,
    "tipo" "TipoAplicacion" NOT NULL,
    "producto" TEXT NOT NULL,
    "productoClave" TEXT NOT NULL,
    "lote" TEXT,
    "fecha" TEXT NOT NULL,
    "proximaFecha" TEXT,
    "notas" TEXT,
    "aplicadoPor" TEXT NOT NULL,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "recordatorioEnviado" TIMESTAMP(3),
    "recordatorioEnviadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aplicacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Aplicacion_mascotaId_productoClave_idx" ON "Aplicacion"("mascotaId", "productoClave");

-- CreateIndex
CREATE INDEX "Aplicacion_resuelta_proximaFecha_idx" ON "Aplicacion"("resuelta", "proximaFecha");

-- AddForeignKey
ALTER TABLE "Aplicacion" ADD CONSTRAINT "Aplicacion_mascotaId_fkey" FOREIGN KEY ("mascotaId") REFERENCES "Mascota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aplicacion" ADD CONSTRAINT "Aplicacion_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "Consulta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

