-- AlterTable
ALTER TABLE "ParteInternacion" ADD COLUMN     "editadoEn" TIMESTAMP(3),
ADD COLUMN     "editadoPor" TEXT;

-- CreateTable
CREATE TABLE "EstudioInternacion" (
    "id" TEXT NOT NULL,
    "internacionId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultado" TEXT,
    "autor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstudioInternacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdjuntoEstudio" (
    "id" TEXT NOT NULL,
    "estudioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanio" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "subidoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdjuntoEstudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstudioInternacion_internacionId_idx" ON "EstudioInternacion"("internacionId");

-- CreateIndex
CREATE INDEX "AdjuntoEstudio_estudioId_idx" ON "AdjuntoEstudio"("estudioId");

-- AddForeignKey
ALTER TABLE "EstudioInternacion" ADD CONSTRAINT "EstudioInternacion_internacionId_fkey" FOREIGN KEY ("internacionId") REFERENCES "Internacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjuntoEstudio" ADD CONSTRAINT "AdjuntoEstudio_estudioId_fkey" FOREIGN KEY ("estudioId") REFERENCES "EstudioInternacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Seguridad: toda tabla nueva con RLS (ver 20260929120000_activar_rls).
ALTER TABLE "EstudioInternacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdjuntoEstudio" ENABLE ROW LEVEL SECURITY;
