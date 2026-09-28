-- CreateTable
CREATE TABLE "Consulta" (
    "id" TEXT NOT NULL,
    "mascotaId" TEXT NOT NULL,
    "turnoId" TEXT,
    "fecha" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "anamnesis" TEXT,
    "pesoKg" DOUBLE PRECISION,
    "temperatura" DOUBLE PRECISION,
    "frecuenciaCardiaca" INTEGER,
    "frecuenciaRespiratoria" INTEGER,
    "condicionCorporal" INTEGER,
    "mucosas" TEXT,
    "hidratacion" TEXT,
    "examen" TEXT,
    "diagnostico" TEXT,
    "tratamiento" TEXT,
    "estudios" TEXT,
    "proximoControl" TEXT,
    "autorNombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdjuntoConsulta" (
    "id" TEXT NOT NULL,
    "consultaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanio" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "subidoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdjuntoConsulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultaCambio" (
    "id" TEXT NOT NULL,
    "consultaId" TEXT NOT NULL,
    "datosAnteriores" JSONB NOT NULL,
    "editadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultaCambio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Consulta_mascotaId_fecha_idx" ON "Consulta"("mascotaId", "fecha");

-- CreateIndex
CREATE INDEX "AdjuntoConsulta_consultaId_idx" ON "AdjuntoConsulta"("consultaId");

-- CreateIndex
CREATE INDEX "ConsultaCambio_consultaId_idx" ON "ConsultaCambio"("consultaId");

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_mascotaId_fkey" FOREIGN KEY ("mascotaId") REFERENCES "Mascota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjuntoConsulta" ADD CONSTRAINT "AdjuntoConsulta_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "Consulta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaCambio" ADD CONSTRAINT "ConsultaCambio_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "Consulta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

