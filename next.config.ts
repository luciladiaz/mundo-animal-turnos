import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Evita que Next.js confunda la raíz del monorepo SKILLS/ (que tiene su propio
  // package-lock.json) con la raíz de este proyecto.
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    // El logo se sirve desde Vercel Blob (storage persistente) — hay que
    // permitir explícitamente ese dominio para poder usar next/image con él.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
