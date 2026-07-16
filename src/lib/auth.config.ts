import type { NextAuthConfig } from "next-auth";

// Config "edge-safe": sin providers que dependan de Prisma/bcrypt (Node-only),
// para poder usarla también desde middleware.ts (que corre en runtime Edge).
// Los providers reales se agregan en auth.ts.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/admin/login",
  },
  providers: [],
  callbacks: {
    authorized: ({ auth, request }) => {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const esRutaAdminProtegida = pathname.startsWith("/admin") && pathname !== "/admin/login";
      if (esRutaAdminProtegida) return isLoggedIn;
      return true;
    },
  },
};
