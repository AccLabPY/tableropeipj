import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/auth.config";

/**
 * Protección gruesa de rutas (¿hay sesión?). El control fino por rol lo hacen
 * los guards de página/endpoint. Corre en edge runtime → solo auth.config.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    // brand/: logos institucionales estáticos (public/brand) — deben verse
    // en /login, sin sesión.
    "/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|favicon/|brand/).*)",
  ],
};
