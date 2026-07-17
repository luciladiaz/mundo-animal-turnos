import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Nombre de usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const admin = await prisma.adminUser.findUnique({ where: { email } });
        if (!admin || !admin.activo) return null;

        const passwordOk = await bcrypt.compare(password, admin.passwordHash);
        if (!passwordOk) return null;

        return {
          id: admin.id,
          email: admin.email,
          name: admin.nombre,
          esAdmin: admin.esAdmin,
          permisos: admin.permisos,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt: async ({ token, user }) => {
      if (user) {
        const u = user as { esAdmin?: boolean; permisos?: string[] };
        token.esAdmin = u.esAdmin;
        token.permisos = u.permisos;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        const u = session.user as { esAdmin?: boolean; permisos?: string[] };
        u.esAdmin = token.esAdmin as boolean | undefined;
        u.permisos = token.permisos as string[] | undefined;
      }
      return session;
    },
  },
});
