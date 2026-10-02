-- CreateEnum
CREATE TYPE "TipoMovimientoStock" AS ENUM ('INICIAL', 'COMPRA', 'VENTA', 'ANULACION_VENTA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "EstadoCaja" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('VENTA', 'ANULACION_VENTA', 'COBRO_CUENTA_CORRIENTE', 'GASTO', 'INGRESO', 'RETIRO');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('ACTIVA', 'ANULADA');

-- CreateTable
CREATE TABLE "CategoriaProducto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoriaProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedioPago" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "esEfectivo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MedioPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreClave" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "precioVenta" INTEGER NOT NULL,
    "costo" INTEGER,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "controlaVencimiento" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoteStock" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "generico" BOOLEAN NOT NULL DEFAULT false,
    "codigo" TEXT,
    "vencimiento" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoteStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "tipo" "TipoMovimientoStock" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "ventaItemId" TEXT,
    "motivo" TEXT,
    "usuario" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caja" (
    "id" TEXT NOT NULL,
    "estado" "EstadoCaja" NOT NULL DEFAULT 'ABIERTA',
    "abiertaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abiertaPor" TEXT NOT NULL,
    "efectivoInicial" INTEGER NOT NULL,
    "cerradaEn" TIMESTAMP(3),
    "cerradaPor" TEXT,
    "observacionesCierre" TEXT,

    CONSTRAINT "Caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoCaja" (
    "id" TEXT NOT NULL,
    "cajaId" TEXT NOT NULL,
    "medioPagoId" TEXT NOT NULL,
    "tipo" "TipoMovimientoCaja" NOT NULL,
    "monto" INTEGER NOT NULL,
    "ventaId" TEXT,
    "pagoCuentaCorrienteId" TEXT,
    "descripcion" TEXT,
    "usuario" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CajaConteo" (
    "id" TEXT NOT NULL,
    "cajaId" TEXT NOT NULL,
    "medioPagoId" TEXT NOT NULL,
    "esperado" INTEGER NOT NULL,
    "contado" INTEGER NOT NULL,

    CONSTRAINT "CajaConteo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "cajaId" TEXT NOT NULL,
    "tutorId" TEXT,
    "total" INTEGER NOT NULL,
    "pagado" INTEGER NOT NULL,
    "observaciones" TEXT,
    "usuario" TEXT NOT NULL,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'ACTIVA',
    "anuladaEn" TIMESTAMP(3),
    "anuladaPor" TEXT,
    "motivoAnulacion" TEXT,
    "cajaAnulacionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaItem" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT,
    "servicioId" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioLista" INTEGER NOT NULL,
    "precioUnitario" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "VentaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaPago" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "medioPagoId" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,

    CONSTRAINT "VentaPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoCuentaCorriente" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "cajaId" TEXT NOT NULL,
    "medioPagoId" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "usuario" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoCuentaCorriente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaProducto_nombre_key" ON "CategoriaProducto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "MedioPago_nombre_key" ON "MedioPago"("nombre");

-- CreateIndex
CREATE INDEX "Producto_nombreClave_idx" ON "Producto"("nombreClave");

-- CreateIndex
CREATE INDEX "LoteStock_productoId_idx" ON "LoteStock"("productoId");

-- CreateIndex
CREATE INDEX "MovimientoStock_productoId_createdAt_idx" ON "MovimientoStock"("productoId", "createdAt");

-- CreateIndex
CREATE INDEX "MovimientoStock_loteId_idx" ON "MovimientoStock"("loteId");

-- CreateIndex
CREATE INDEX "MovimientoStock_ventaItemId_idx" ON "MovimientoStock"("ventaItemId");

-- CreateIndex
CREATE INDEX "Caja_estado_idx" ON "Caja"("estado");

-- CreateIndex
CREATE INDEX "MovimientoCaja_cajaId_idx" ON "MovimientoCaja"("cajaId");

-- CreateIndex
CREATE INDEX "MovimientoCaja_ventaId_idx" ON "MovimientoCaja"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "CajaConteo_cajaId_medioPagoId_key" ON "CajaConteo"("cajaId", "medioPagoId");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_numero_key" ON "Venta"("numero");

-- CreateIndex
CREATE INDEX "Venta_cajaId_idx" ON "Venta"("cajaId");

-- CreateIndex
CREATE INDEX "Venta_tutorId_idx" ON "Venta"("tutorId");

-- CreateIndex
CREATE INDEX "Venta_createdAt_idx" ON "Venta"("createdAt");

-- CreateIndex
CREATE INDEX "VentaItem_ventaId_idx" ON "VentaItem"("ventaId");

-- CreateIndex
CREATE INDEX "VentaItem_productoId_idx" ON "VentaItem"("productoId");

-- CreateIndex
CREATE INDEX "VentaPago_ventaId_idx" ON "VentaPago"("ventaId");

-- CreateIndex
CREATE INDEX "PagoCuentaCorriente_tutorId_idx" ON "PagoCuentaCorriente"("tutorId");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteStock" ADD CONSTRAINT "LoteStock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "LoteStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_ventaItemId_fkey" FOREIGN KEY ("ventaItemId") REFERENCES "VentaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "Caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_medioPagoId_fkey" FOREIGN KEY ("medioPagoId") REFERENCES "MedioPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_pagoCuentaCorrienteId_fkey" FOREIGN KEY ("pagoCuentaCorrienteId") REFERENCES "PagoCuentaCorriente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CajaConteo" ADD CONSTRAINT "CajaConteo_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "Caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CajaConteo" ADD CONSTRAINT "CajaConteo_medioPagoId_fkey" FOREIGN KEY ("medioPagoId") REFERENCES "MedioPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "Caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_cajaAnulacionId_fkey" FOREIGN KEY ("cajaAnulacionId") REFERENCES "Caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaPago" ADD CONSTRAINT "VentaPago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaPago" ADD CONSTRAINT "VentaPago_medioPagoId_fkey" FOREIGN KEY ("medioPagoId") REFERENCES "MedioPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaCorriente" ADD CONSTRAINT "PagoCuentaCorriente_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaCorriente" ADD CONSTRAINT "PagoCuentaCorriente_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "Caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuentaCorriente" ADD CONSTRAINT "PagoCuentaCorriente_medioPagoId_fkey" FOREIGN KEY ("medioPagoId") REFERENCES "MedioPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================================
-- Agregado a mano (Prisma no lo genera)
-- ============================================================================

-- Una sola caja ABIERTA a la vez: la base rechaza abrir una segunda.
CREATE UNIQUE INDEX "Caja_una_sola_abierta" ON "Caja" ("estado") WHERE "estado" = 'ABIERTA';

-- Un solo lote genérico por producto (el que puede quedar negativo).
CREATE UNIQUE INDEX "LoteStock_un_generico_por_producto" ON "LoteStock" ("productoId") WHERE "generico" = true;

-- Seguridad (ver migración 20260929120000_activar_rls): toda tabla nueva con RLS.
ALTER TABLE "CategoriaProducto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedioPago" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Producto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoteStock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MovimientoStock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Caja" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MovimientoCaja" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CajaConteo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Venta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VentaItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VentaPago" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PagoCuentaCorriente" ENABLE ROW LEVEL SECURITY;

-- Datos iniciales que pidió la veterinaria (editables desde el panel).
INSERT INTO "MedioPago" ("id", "nombre", "orden", "esEfectivo") VALUES
    (gen_random_uuid()::text, 'Efectivo', 1, true),
    (gen_random_uuid()::text, 'Débito', 2, false),
    (gen_random_uuid()::text, 'Crédito', 3, false),
    (gen_random_uuid()::text, 'Transferencia', 4, false),
    (gen_random_uuid()::text, 'QR', 5, false);

INSERT INTO "CategoriaProducto" ("id", "nombre") VALUES
    (gen_random_uuid()::text, 'Medicamentos'),
    (gen_random_uuid()::text, 'Accesorios'),
    (gen_random_uuid()::text, 'Peces');
