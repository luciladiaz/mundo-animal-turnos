-- Seguridad: Supabase expone las tablas del esquema public por su API (PostgREST) a los
-- roles anon/authenticated. Esta app NO usa esa API: se conecta directo con Prisma como
-- "postgres", que saltea RLS. Activar RLS sin políticas cierra la API y no cambia nada
-- para la app. OJO: toda tabla nueva que se cree en una migración futura tiene que
-- llevar también su ALTER TABLE ... ENABLE ROW LEVEL SECURITY.
ALTER TABLE "AdjuntoConsulta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Aplicacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConfiguracionNegocio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consulta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsultaCambio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiaCerrado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HorarioBloque" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Mascota" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Servicio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Turno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tutor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
