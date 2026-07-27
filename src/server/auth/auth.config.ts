import type { NextAuthConfig } from "next-auth";

/**
 * Configuración edge-safe de Auth.js (split config):
 * la importa el middleware — NO puede importar Prisma ni bcrypt.
 * La configuración completa (Credentials + verificación) vive en auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 horas
  callbacks: {
    authorized({ auth, request }) {
      const logueado = !!auth?.user;
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/login")) {
        return logueado
          ? Response.redirect(new URL("/ejecutivo", request.nextUrl))
          : true;
      }
      return logueado;
    },
  },
  providers: [], // se completan en auth.ts
} satisfies NextAuthConfig;
