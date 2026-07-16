import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/prisma";

// Fraunces: serif cálida y con carácter para títulos — transmite cuidado y cercanía,
// evita el look "SaaS corporativo" que pediría una sans genérica en los títulos.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

// Plus Jakarta Sans: sans geométrica de terminales redondeadas para texto de UI/cuerpo —
// legible en tamaños chicos (botones, formularios) sin caer en Inter/Roboto genéricas.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Mundo Animal — Reservar turno",
  description: "Reservá tu turno online en Mundo Animal.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Colores de marca del negocio, aplicados como variables CSS en runtime —
  // así el cliente ve la identidad real de la veterinaria, no un diseño genérico
  // fijado en tiempo de build.
  const configuracion = await prisma.configuracionNegocio.findFirst();
  const colorPrimario = configuracion?.colorPrimario ?? "#7b2d8e";
  const colorSecundario = configuracion?.colorSecundario ?? "#1c8fc7";

  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${jakarta.variable} h-full antialiased`}
      style={
        {
          "--color-primario": colorPrimario,
          "--color-secundario": colorSecundario,
        } as React.CSSProperties
      }
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] font-sans">
        {children}
      </body>
    </html>
  );
}
