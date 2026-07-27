import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Tablero PEI 2026–2030 · Poder Judicial del Paraguay",
    template: "%s · PEI 2026–2030 · Poder Judicial",
  },
  description:
    "Plataforma de Seguimiento del Plan Estratégico Institucional 2026–2030 de la Corte Suprema de Justicia del Paraguay",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
