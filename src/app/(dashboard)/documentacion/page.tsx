import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  ClipboardEdit,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/ui/components/page-header";
import { Card } from "@/ui/components/card";

export const metadata: Metadata = { title: "Documentación" };

const GUIAS = [
  {
    href: "/documentacion/primeros-pasos",
    titulo: "Primeros pasos",
    desc: "Roles y permisos, navegación, selector de ejercicio y modo prueba. Empiece por aquí.",
    Icono: GraduationCap,
    audiencia: "Todos los usuarios",
  },
  {
    href: "/documentacion/guia-de-carga",
    titulo: "Guía de carga de avances",
    desc: "Paso a paso para reportar el avance de un indicador: variables, cálculo automático, evidencias y envío a validación.",
    Icono: ClipboardEdit,
    audiencia: "Dependencias responsables",
  },
  {
    href: "/documentacion/guia-del-validador",
    titulo: "Guía del validador",
    desc: "Revisión de mediciones enviadas, descarga de evidencias, aprobación, observación, rechazo y rectificación.",
    Icono: ShieldCheck,
    audiencia: "DGPD",
  },
  {
    href: "/documentacion/glosario",
    titulo: "Glosario metodológico",
    desc: "Los conceptos del PEI explicados: cumplimiento normalizado, línea base, semáforo, cobertura, escalas y más.",
    Icono: BookOpen,
    audiencia: "Referencia",
  },
] as const;

export default function DocumentacionPage() {
  return (
    <section>
      <PageHeader
        title="Documentación"
        subtitle="Manual operativo y metodológico de la Plataforma de Seguimiento del PEI 2026–2030"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {GUIAS.map((g) => (
          <Link key={g.href} href={g.href} className="group">
            <Card className="flex h-full flex-col p-5 transition-shadow hover:shadow-toast">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-pj bg-azul-soft text-azul-d">
                  <g.Icono className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-serif text-[15.5px] font-semibold text-tinta group-hover:text-azul-d">
                    {g.titulo}
                  </h2>
                  <div className="text-[10.5px] uppercase tracking-[.08em] text-muted-2">
                    {g.audiencia}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                {g.desc}
              </p>
            </Card>
          </Link>
        ))}
      </div>
      <p className="mt-5 text-[11.5px] text-muted">
        Cada guía puede imprimirse como manual (Ctrl+P → Guardar como PDF).
        Ante dudas metodológicas no cubiertas aquí, contacte a la Dirección
        General de Planificación y Desarrollo.
      </p>
    </section>
  );
}
