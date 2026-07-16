import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Evita que Next.js confunda la raíz del monorepo SKILLS/ (que tiene su propio
  // package-lock.json) con la raíz de este proyecto.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
