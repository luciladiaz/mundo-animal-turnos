import { Resend } from "resend";
import { TIMEZONE } from "@/lib/disponibilidad";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "turnos@mundoanimal.com";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface DatosNotificacionAdmin {
  clienteNombre: string;
  mascotaNombre: string;
  servicioNombre: string;
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
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

export async function enviarNotificacionAdmin(
  adminEmail: string,
  datos: DatosNotificacionAdmin
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
          ${datos.mascotaNombre ? `<li><strong>Mascota:</strong> ${datos.mascotaNombre}</li>` : ""}
          <li><strong>Servicio:</strong> ${datos.servicioNombre}</li>
          <li><strong>Fecha:</strong> ${fechaLegible} — ${datos.horaInicio}hs</li>
        </ul>
      `,
    });
  } catch (err) {
    console.error("Error enviando notificación a admin:", err);
  }
}
