import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { prismaControl } from "@/server/db/client";
import type { RolUsuario } from "@/domain/types";

const CredencialesSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Auth.js v5 con Credentials + JWT.
 * La autenticación SIEMPRE se hace contra la base de PRODUCCIÓN (plano de
 * control): el switch prod/test solo cambia los DATOS que ve un ADMIN, nunca
 * el padrón de usuarios. El seed garantiza IDs de usuario idénticos en ambas
 * bases para que las referencias de la base test sean coherentes.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = CredencialesSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const usuario = await prismaControl().usuario.findUnique({
          where: { email },
          include: { roles: true, dependencias: true },
        });
        if (!usuario || !usuario.activo) return null;
        const valido = await bcrypt.compare(password, usuario.passwordHash);
        if (!valido) return null;

        return {
          id: String(usuario.id),
          name: usuario.nombre,
          email: usuario.email,
          roles: usuario.roles.map((r) => r.rol as RolUsuario),
          dependenciaIds: usuario.dependencias.map((d) => d.dependenciaId),
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.roles = user.roles;
        token.dependenciaIds = user.dependenciaIds;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.roles = (token.roles as RolUsuario[]) ?? [];
      session.user.dependenciaIds = (token.dependenciaIds as number[]) ?? [];
      return session;
    },
  },
});
