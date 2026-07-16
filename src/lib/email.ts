import { Resend } from "resend";
import { createEvent } from "ics";
import { TIMEZONE } from "@/lib/disponibilidad";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "turnos@mundoanimal.com";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface DatosTurnoEmail {
  clienteNombre: string;
  clienteEmail?: string | null;
  mascotaNombre: string;
  servicioNombre: string;
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  horaFin: string;
  negocioNombre: string;
  negocioTelefono?: string | null;
  negocioDireccion?: string | null;
}

function generarIcs(datos: DatosTurnoEmail): string | undefined {
  const [year, month, day] = datos.fecha.split("-").map(Number);
  const [hour, minute] = datos.horaInicio.split(":").map(Number);
  const [horaFinNum, minutoFinNum] = datos.horaFin.split(":").map(Number);

  const inicioMinutos = hour * 60 + minute;
  const finMinutos = horaFinNum * 60 + minutoFinNum;
  const duracionMinutos = finMinutos - inicioMinutos;

  const { error, value } = createEvent({
    title: `Turno ${datos.servicioNombre} — ${datos.negocioNombre}`,
    description: `Turno para ${datos.mascotaNombre} (dueño/a: ${datos.clienteNombre}).`,
    location: datos.negocioDireccion || undefined,
    start: [year, month, day, hour, minute],
    duration: { minutes: duracionMinutos },
    startInputType: "local",
    startOutputType: "local",
  });

  if (error) {
    console.error("Error generando .ics:", error);
    return undefined;
  }
  return value ?? undefined;
}

function formatearFechaLegible(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const dateAtNoonUTC = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(dateAtNoonUTC);
}

export async function enviarConfirmacionCliente(datos: DatosTurnoEmail): Promise<void> {
  if (!datos.clienteEmail) return;

  const fechaLegible = formatearFechaLegible(datos.fecha);
  const ics = generarIcs(datos);

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>${datos.negocioNombre}</h2>
      <p>Hola ${datos.clienteNombre}, tu turno quedó confirmado:</p>
      <ul>
        <li><strong>Servicio:</strong> ${datos.servicioNombre}</li>
        <li><strong>Mascota:</strong> ${datos.mascotaNombre}</li>
        <li><strong>Fecha:</strong> ${fechaLegible}</li>
        <li><strong>Hora:</strong> ${datos.horaInicio} hs</li>
      </ul>
      ${datos.negocioDireccion ? `<p><strong>Dirección:</strong> ${datos.negocioDireccion}</p>` : ""}
      ${datos.negocioTelefono ? `<p><strong>Teléfono:</strong> ${datos.negocioTelefono}</p>` : ""}
      <p>Te dejamos un archivo adjunto para agregar el turno a tu calendario.</p>
    </div>
  `;

  if (!resend) {
    console.log("[email] RESEND_API_KEY no configurada — email de confirmación no enviado. Datos:", {
      to: datos.clienteEmail,
      subject: `Turno confirmado — ${datos.negocioNombre}`,
    });
    return;
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: datos.clienteEmail,
      subject: `Turno confirmado — ${datos.negocioNombre}`,
      html,
      attachments: ics
        ? [{ filename: "turno.ics", content: Buffer.from(ics).toString("base64") }]
        : undefined,
    });
  } catch (err) {
    // Un error de email nunca debe hacer fallar la reserva del turno.
    console.error("Error enviando email de confirmación:", err);
  }
}

export async function enviarNotificacionAdmin(
  adminEmail: string,
  datos: DatosTurnoEmail
): Promise<void> {
  if (!resend) {
    console.log("[email] RESEND_API_KEY no configurada — notificación a admin no enviada.");
    return;
  }

  const fechaLegible = formatearFechaLegible(datos.fecha);

  try {
    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: `Nuevo turno reservado — ${fechaLegible} ${datos.horaInicio}hs`,
      html: `
        <p>Nuevo turno reservado:</p>
        <ul>
          <li><strong>Cliente:</strong> ${datos.clienteNombre}</li>
          <li><strong>Mascota:</strong> ${datos.mascotaNombre}</li>
          <li><strong>Servicio:</strong> ${datos.servicioNombre}</li>
          <li><strong>Fecha:</strong> ${fechaLegible} — ${datos.horaInicio}hs</li>
        </ul>
      `,
    });
  } catch (err) {
    console.error("Error enviando notificación a admin:", err);
  }
}
