import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { getTema } from "@/server/tema/tema";
import "./globals.css";

/** Tipografía del tema Agentes PEI (self-hosted por next/font en el build). */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

/** Color del chrome del navegador móvil según el tema activo. */
export async function generateViewport(): Promise<Viewport> {
  const tema = await getTema();
  return {
    width: "device-width",
    initialScale: 1,
    themeColor: tema === "agentes" ? "#007cc2" : "#14395B",
  };
}

export const metadata: Metadata = {
  title: {
    default: "Tablero PEI 2026–2030 · Poder Judicial del Paraguay",
    template: "%s · PEI 2026–2030 · Poder Judicial",
  },
  description:
    "Plataforma de Seguimiento del Plan Estratégico Institucional 2026–2030 de la Corte Suprema de Justicia del Paraguay",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // El tema se resuelve en el servidor: el HTML ya llega con data-theme
  // correcto (sin flash ni desajuste de hidratación).
  const tema = await getTema();
  return (
    <html lang="es" data-theme={tema} className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
