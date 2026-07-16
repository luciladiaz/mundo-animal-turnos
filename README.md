# Mundo Animal — Gestión de Turnos

App de reserva de turnos para veterinaria: página pública de reserva (mobile-first) + panel de administración con login.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Prisma (SQLite en desarrollo) + NextAuth v5 (Credentials) + Resend (email) + `ics` (adjunto de calendario).

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000` para la página pública de reserva, y `http://localhost:3000/admin` para el panel de administración.

**Usuario admin de arranque** (definido en `.env`, creado por el seed):
- Usuario: `admin`
- Contraseña: `MundoAnimal2026!`

Desde **Configuración → Usuarios** (solo visible para el rol admin) se puede cambiar la contraseña de este usuario, crear cuentas nuevas (ej. la secretaria que carga turnos, con rol "secretaria" y acceso solo a Dashboard/Turnos) o cambiar el nombre de usuario. El sistema no permite dejar el negocio sin ningún admin activo.

## Base de datos

Arranca con **SQLite local** (`prisma/dev.db`) para no depender de ninguna cuenta externa. El schema (`prisma/schema.prisma`) fue diseñado para que migrar a Postgres (Supabase/Neon) sea un cambio chico:

1. Cambiar `provider = "sqlite"` a `provider = "postgresql"` en `prisma/schema.prisma`.
2. Poner la connection string real de Supabase/Neon en `DATABASE_URL` (`.env`).
3. Correr `npx prisma migrate dev` de nuevo (o `npx prisma migrate deploy` en producción).

Para resetear/recargar los datos de ejemplo: `npx prisma migrate reset` (borra todo y vuelve a correr el seed).

## Datos de ejemplo cargados por el seed (`prisma/seed.ts`)

Todo esto es **placeholder para editar desde el panel de Configuración** antes de ir a producción:

- Nombre del negocio, colores y dirección/teléfono — placeholder.
- 5 servicios de ejemplo (Consulta general, Vacunación, Desparasitación, Baño y peluquería, Cirugía menor).
- Horario de ejemplo: lunes a viernes 09:00–13:00 y 15:00–19:00, sábados 09:00–13:00, domingo cerrado.

## Email (Resend)

Sin `RESEND_API_KEY` configurada, el sistema **no falla** — loguea en consola lo que hubiera mandado y sigue funcionando (la reserva del turno nunca depende de que el email salga bien). Para activar el envío real:

1. Creá una cuenta gratis en [resend.com](https://resend.com) y conseguí tu API key.
2. Pegala en `RESEND_API_KEY` en `.env`.
3. Verificá un dominio propio en Resend y poné esa dirección en `RESEND_FROM_EMAIL` (mientras no verifiques un dominio, Resend solo deja mandar a tu propio email de cuenta).
4. Completá `ADMIN_NOTIFICACION_EMAIL` con el email real donde la veterinaria quiere recibir el aviso de "nuevo turno reservado" (es independiente del usuario de login, que ya no tiene por qué ser un email).

## Zona horaria

Toda la lógica de disponibilidad usa `America/Argentina/Buenos_Aires` fija (ver `src/lib/disponibilidad.ts`) — fechas y horas de turnos se guardan como texto (`"2026-07-15"`, `"09:00"`), no como `DateTime`, para no depender de conversiones UTC/local.

## Lógica de disponibilidad — dónde está y cómo se prueba

El corazón del sistema es `src/lib/disponibilidad.ts` (funciones puras, sin dependencias de base de datos — fáciles de testear). La validación de solapamientos se hace en el backend en dos lugares:

- `POST /api/turnos` — dentro de una transacción de Prisma, re-chequea solapamientos justo antes de crear el turno (para minimizar la ventana de carrera si dos personas reservan al mismo tiempo).
- `PATCH /api/turnos/[id]` — al reprogramar, revalida contra los demás turnos del nuevo día.

**Limitación conocida:** con SQLite no hay manera de agregar una restricción a nivel de base de datos que impida el solapamiento (a diferencia de Postgres, donde se podría agregar una *exclusion constraint*). El re-chequeo dentro de la transacción reduce mucho el riesgo, pero no lo elimina al 100%. Si esto se vuelve un problema real en producción con mucho tráfico simultáneo, migrar a Postgres y agregar ahí una constraint de exclusión es la solución definitiva.

## Deploy

Pensado para Vercel:

1. Migrar la base a Postgres (Supabase/Neon) como se explica arriba.
2. Subir el repo a GitHub y conectarlo en Vercel.
3. Configurar las variables de entorno de `.env.example` en el proyecto de Vercel (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` con el dominio real, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`).
4. El logo subido por el admin se guarda en `/public/uploads` — en Vercel el filesystem es efímero, así que para producción real conviene migrar esa subida a un storage persistente (Supabase Storage, S3, etc.) en vez de `fs.writeFile`.
