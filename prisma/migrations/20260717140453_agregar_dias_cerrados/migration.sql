-- CreateTable
CREATE TABLE "DiaCerrado" (
    "id" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "motivo" TEXT,

    CONSTRAINT "DiaCerrado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiaCerrado_fecha_key" ON "DiaCerrado"("fecha");

-- CreateIndex
CREATE INDEX "DiaCerrado_fecha_idx" ON "DiaCerrado"("fecha");
