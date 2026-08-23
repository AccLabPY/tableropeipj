import { Aparecer } from "@/ui/motion/aparecer";

/**
 * template.tsx se remonta en cada navegación: transición de entrada de
 * página (solo activa en el tema Agentes, ver Aparecer).
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Aparecer>{children}</Aparecer>;
}
