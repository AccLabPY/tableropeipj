import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { prismaControl } from "@/server/db/client";
import type { RolUsuario } from "@/domain/types";
import { esTema, TEMA_DEFAULT } from "@/shared/tema";
import { vigenciaUsuario } from "./vigencia";

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
        const { password } = parsed.data;
        // El email se guarda normalizado: en PostgreSQL el unique/findUnique
        // distinguen mayúsculas (en TiDB la collation los igualaba).
        const email = parsed.data.email.trim().toLowerCase();

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
          tema: esTema(usuario.tema) ? usuario.tema : TEMA_DEFAULT,
          sesionVersion: usuario.sesionVersion,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * En el login copia los claims; en cada request posterior (Node) los
     * recarga desde la base de control: un cambio de roles o dependencias rige
     * sin cerrar sesión, y una cuenta desactivada o con `sesionVersion`
     * cambiada invalida el token (devolver null anula la sesión). El
     * middleware edge no pasa por acá: lo cubre requirePage → /salir.
     */
    async jwt({ token, user }) {
      if (user) {
        token.roles = user.roles;
        token.dependenciaIds = user.dependenciaIds;
        token.tema = user.tema;
        token.sv = user.sesionVersion;
        return token;
      }
      const id = Number(token.sub);
      if (!Number.isInteger(id)) return null;
      const v = await vigenciaUsuario(id);
      if (!v || !v.activo || v.sesionVersion !== (token.sv ?? 0)) return null;
      token.roles = v.roles;
      token.dependenciaIds = v.dependenciaIds;
      token.tema = v.tema;
      token.name = v.nombre;
      token.email = v.email;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.roles = (token.roles as RolUsuario[]) ?? [];
      session.user.dependenciaIds = (token.dependenciaIds as number[]) ?? [];
      session.user.tema = esTema(token.tema) ? token.tema : TEMA_DEFAULT;
      return session;
    },
  },
});
