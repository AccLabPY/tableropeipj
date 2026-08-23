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
  // Favicons institucionales del Poder Judicial (public/favicon/, tomados de pj.gov.py)
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon/android-icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [57, 60, 72, 76, 114, 120, 144, 152, 180].map((n) => ({
      url: `/favicon/apple-icon-${n}x${n}.png`,
      sizes: `${n}x${n}`,
      type: "image/png",
    })),
  },
  manifest: "/favicon/manifest.json",
  other: {
    "msapplication-TileColor": "#5194CF",
    "msapplication-TileImage": "/favicon/ms-icon-144x144.png",
  },
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
