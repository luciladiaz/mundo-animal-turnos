-- CreateEnum
CREATE TYPE "OrigenTurno" AS ENUM ('MANUAL', 'CLIENTE');

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "origen" "OrigenTurno" NOT NULL DEFAULT 'CLIENTE';
