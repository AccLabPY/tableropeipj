import { BotonImprimir } from "@/ui/features/reportes/boton-imprimir";

/**
 * Layout de los reportes imprimibles: sin AppBar/Sidebar/Footer, fondo
 * blanco, ancho de página A4-friendly y botón flotante de impresión.
 * La autenticación la exige el middleware + requirePage() en cada página.
 */
export default function ReportesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-[100svh] bg-white">
      <main className="mx-auto max-w-[900px] px-5 py-6 print:max-w-none print:p-0">
        {children}
      </main>
      <BotonImprimir />
    </div>
  );
}
