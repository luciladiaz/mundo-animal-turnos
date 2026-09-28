-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "mascotaId" TEXT,
ADD COLUMN     "tutorId" TEXT;

-- CreateTable
CREATE TABLE "Tutor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "telefonoClave" TEXT NOT NULL,
    "email" TEXT,
    "dni" TEXT,
    "direccion" TEXT,
    "notas" TEXT,
    "aceptaRecordatorios" BOOLEAN NOT NULL DEFAULT false,
    "aceptaRecordatoriosFecha" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mascota" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreClave" TEXT NOT NULL,
    "especie" TEXT,
    "raza" TEXT,
    "sexo" TEXT,
    "castrado" BOOLEAN,
    "fechaNacimiento" TEXT,
    "color" TEXT,
    "microchip" TEXT,
    "pesoKg" DOUBLE PRECISION,
    "fotoUrl" TEXT,
    "alertas" TEXT,
    "notas" TEXT,
    "fallecida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mascota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tutor_telefonoClave_key" ON "Tutor"("telefonoClave");

-- CreateIndex
CREATE INDEX "Mascota_tutorId_nombreClave_idx" ON "Mascota"("tutorId", "nombreClave");

-- CreateIndex
CREATE INDEX "Turno_tutorId_idx" ON "Turno"("tutorId");

-- CreateIndex
CREATE INDEX "Turno_mascotaId_idx" ON "Turno"("mascotaId");

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_mascotaId_fkey" FOREIGN KEY ("mascotaId") REFERENCES "Mascota"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mascota" ADD CONSTRAINT "Mascota_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================================
-- Armado de fichas a partir de los turnos ya cargados.
-- Solo AGREGA filas en Tutor/Mascota y completa Turno.tutorId/mascotaId: no borra
-- ni modifica ningún dato de los turnos (nombre, teléfono, mascota quedan igual).
-- Mismos criterios que src/lib/fichas.ts:
--   * tutor = últimos 10 dígitos del teléfono (sin espacios/guiones/prefijos)
--   * mascota = nombre en minúsculas, sin espacios de más, dentro del mismo tutor
-- Nombre/teléfono de la ficha = los del turno más reciente de ese teléfono.
-- ============================================================================

-- 1) Un tutor por teléfono.
INSERT INTO "Tutor" ("id", "nombre", "telefono", "telefonoClave", "email", "updatedAt")
SELECT gen_random_uuid()::text, u.nombre, u.telefono, u.clave, u.email, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT ON (clave)
        clave,
        trim("clienteNombre") AS nombre,
        trim("clienteTelefono") AS telefono,
        NULLIF(trim("clienteEmail"), '') AS email
    FROM (
        SELECT *, right(regexp_replace("clienteTelefono", '\D', '', 'g'), 10) AS clave
        FROM "Turno"
    ) t
    WHERE clave <> ''
    ORDER BY clave, "fecha" DESC, "horaInicio" DESC, "createdAt" DESC
) u;

UPDATE "Turno" t
SET "tutorId" = tu."id"
FROM "Tutor" tu
WHERE tu."telefonoClave" = right(regexp_replace(t."clienteTelefono", '\D', '', 'g'), 10);

-- 2) Una mascota por nombre dentro de cada tutor (turnos sin nombre de mascota quedan sin mascota).
INSERT INTO "Mascota" ("id", "tutorId", "nombre", "nombreClave", "updatedAt")
SELECT gen_random_uuid()::text, m."tutorId", m.nombre, m.clave, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT ON ("tutorId", clave)
        "tutorId", clave, upper(left(nombre_limpio, 1)) || substr(nombre_limpio, 2) AS nombre
    FROM (
        SELECT *,
            regexp_replace(trim("mascotaNombre"), '\s+', ' ', 'g') AS nombre_limpio,
            lower(regexp_replace(trim("mascotaNombre"), '\s+', ' ', 'g')) AS clave
        FROM "Turno"
        WHERE "tutorId" IS NOT NULL
    ) t
    WHERE clave <> ''
    ORDER BY "tutorId", clave, "fecha" DESC, "horaInicio" DESC, "createdAt" DESC
) m;

UPDATE "Turno" t
SET "mascotaId" = m."id"
FROM "Mascota" m
WHERE m."tutorId" = t."tutorId"
  AND m."nombreClave" = lower(regexp_replace(trim(t."mascotaNombre"), '\s+', ' ', 'g'));

-- 3) Especie (y raza cuando lo que se escribió era una raza), del turno más reciente que la tenga.
UPDATE "Mascota" m
SET "especie" = CASE
        WHEN e.valor IN ('canino', 'canina', 'perro', 'perra', 'perrito', 'perrita') THEN 'Perro'
        WHEN e.valor IN ('felino', 'felina', 'feline', 'gato', 'gata', 'gatito', 'gatita') THEN 'Gato'
        WHEN e.valor IN ('border collie', 'caniche', 'mestiza', 'mestizo') THEN 'Perro'
        ELSE e.original
    END,
    "raza" = CASE
        WHEN e.valor IN ('border collie', 'caniche', 'mestiza', 'mestizo') THEN e.original
        ELSE NULL
    END
FROM (
    SELECT DISTINCT ON ("mascotaId")
        "mascotaId", trim("mascotaEspecie") AS original, lower(trim("mascotaEspecie")) AS valor
    FROM "Turno"
    WHERE "mascotaId" IS NOT NULL AND coalesce(trim("mascotaEspecie"), '') <> ''
    ORDER BY "mascotaId", "fecha" DESC, "horaInicio" DESC, "createdAt" DESC
) e
WHERE m."id" = e."mascotaId";
