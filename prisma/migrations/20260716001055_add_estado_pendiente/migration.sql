-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Turno" (
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
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Turno_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Turno" ("clienteEmail", "clienteNombre", "clienteTelefono", "createdAt", "estado", "fecha", "horaFin", "horaInicio", "id", "mascotaEspecie", "mascotaNombre", "notas", "servicioId") SELECT "clienteEmail", "clienteNombre", "clienteTelefono", "createdAt", "estado", "fecha", "horaFin", "horaInicio", "id", "mascotaEspecie", "mascotaNombre", "notas", "servicioId" FROM "Turno";
DROP TABLE "Turno";
ALTER TABLE "new_Turno" RENAME TO "Turno";
CREATE INDEX "Turno_fecha_idx" ON "Turno"("fecha");
CREATE INDEX "Turno_servicioId_fecha_idx" ON "Turno"("servicioId", "fecha");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
