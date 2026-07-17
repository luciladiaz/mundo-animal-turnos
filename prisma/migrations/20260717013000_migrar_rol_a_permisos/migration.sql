-- Reemplaza el rol fijo admin/secretaria por permisos granulares por pestaña.
-- Escrita a mano (no generada por `prisma migrate dev`) para preservar los
-- datos existentes: cada usuario con rol "admin" pasa a esAdmin=true, y cada
-- usuario con rol "secretaria" pasa a esAdmin=false con permisos=['turnos']
-- (mismo acceso que tenía antes: Dashboard siempre visible + Turnos).

ALTER TABLE "AdminUser" ADD COLUMN "esAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AdminUser" ADD COLUMN "permisos" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "AdminUser" SET "esAdmin" = true WHERE "rol" = 'admin';
UPDATE "AdminUser" SET "permisos" = ARRAY['turnos'] WHERE "rol" = 'secretaria';

ALTER TABLE "AdminUser" DROP COLUMN "rol";
