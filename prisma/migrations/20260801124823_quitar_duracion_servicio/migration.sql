-- Se elimina la duración por servicio: ahora todos los turnos usan una única
-- duración fija, definida por ConfiguracionNegocio.bufferMinutos.
ALTER TABLE "Servicio" DROP COLUMN "duracionMinutos";
