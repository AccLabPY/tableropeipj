import type { Metadata } from "next";
import { PageHeader } from "@/ui/components/page-header";
import { Card, CardBody, CardHeader } from "@/ui/components/card";
import { BackButton } from "@/ui/components/back-button";
import { GlosarioItem } from "@/ui/features/documentacion/glosario-item";
import { SemPill } from "@/ui/components/sem-pill";

export const metadata: Metadata = { title: "Glosario · Documentación" };

export default function GlosarioPage() {
  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-4">
        <BackButton />
      </div>
      <PageHeader
        title="Glosario metodológico"
        subtitle="Los conceptos del seguimiento del PEI 2026–2030, tal como los aplica la plataforma"
      />

      <Card>
        <CardHeader title="Términos" meta="orden conceptual" />
        <CardBody>
          <dl>
            <GlosarioItem
              termino="Línea base"
              ejemplo="La Tasa de Resolución cerró 2025 en 1,068: esa es su línea base para todo el quinquenio."
            >
              <p>
                El valor de partida del indicador antes del PEI (con su año de
                referencia). Es el punto desde el cual se mide el progreso
                hacia la meta. Algunos indicadores tienen la base «a
                determinar»: hasta fijarla, la plataforma no calcula
                cumplimiento (evita números falsos).
              </p>
            </GlosarioItem>

            <GlosarioItem
              termino="Cumplimiento normalizado"
              ejemplo="Base 18,87 · meta 20 · valor 19,5 ⇒ (19,5 − 18,87) / (20 − 18,87) = 55,75% — no 97,5% como daría valor/meta."
            >
              <p>
                El % de avance hacia la meta del año, medido{" "}
                <b>desde la línea base</b> — nunca es «valor sobre meta».
                Fórmulas según el sentido del indicador (B = base, M = meta,
                V = valor):
              </p>
              <ul className="list-disc pl-5 text-[12.5px]">
                <li>Ascendente con M &gt; B: (V − B) / (M − B)</li>
                <li>Ascendente con M = B (mantenimiento): 100% si V ≥ M</li>
                <li>Descendente con B &gt; M: (B − V) / (B − M)</li>
                <li>Descendente con B = M: 100% si V ≤ M</li>
              </ul>
            </GlosarioItem>

            <GlosarioItem termino="Sentido del indicador">
              <p>
                Define qué significa «mejorar»: <b>ascendente</b> (subir es
                cumplir — la mayoría) o <b>descendente</b> (bajar es cumplir —
                p. ej. las tasas de congestión y pendencia). El cálculo de
                cumplimiento se invierte según el sentido.
              </p>
            </GlosarioItem>

            <GlosarioItem
              termino="Valor capado"
              ejemplo="Un cumplimiento real de 120% se muestra y agrega como 100%; el 120% queda disponible como sobrecumplimiento."
            >
              <p>
                Para el semáforo y los promedios, el cumplimiento se acota al
                rango 0–100%. El valor real sin acotar se conserva para
                análisis (un valor mayor a 100% indica sobrecumplimiento).
              </p>
            </GlosarioItem>

            <GlosarioItem termino="Semáforo y umbrales">
              <p className="flex flex-wrap items-center gap-2">
                <SemPill sem="VERDE" /> cumplimiento ≥ 90% ·{" "}
                <SemPill sem="AMARILLO" /> entre 70% y 90% ·{" "}
                <SemPill sem="ROJO" /> menor a 70% · <SemPill sem="GRIS" /> sin
                dato, base pendiente o concluido.
              </p>
              <p>
                Los umbrales (90/70 por defecto) son configurables con{" "}
                <b>herencia</b>: un umbral definido para un indicador pisa al
                de su Acción, éste al de su Objetivo y éste al global. La ficha
                siempre muestra el origen del umbral aplicado.
              </p>
            </GlosarioItem>

            <GlosarioItem
              termino="Cobertura de reporte"
              ejemplo="«4 de 78 mediciones aprobadas» — un promedio de cumplimiento con cobertura baja es una foto parcial."
            >
              <p>
                Cuántas mediciones aprobadas hay sobre las esperadas del
                período. <b>Siempre acompaña al cumplimiento</b>: los promedios
                se calculan solo sobre lo medido (lo pendiente no vale 0), así
                que la cobertura es la que dice cuán completa es la foto.
              </p>
            </GlosarioItem>

            <GlosarioItem termino="Estados del workflow">
              <p>
                El ciclo de una medición:{" "}
                <b>
                  Borrador → Enviado → (En revisión) → Aprobado / Observado /
                  Rechazado
                </b>
                . Observado vuelve a la dependencia para corregir y reenviar.{" "}
                <b>Solo lo Aprobado alimenta los tableros oficiales.</b> Cada
                transición queda en un historial inmutable con autor, fecha y
                comentario.
              </p>
            </GlosarioItem>

            <GlosarioItem
              termino="Escala de avance"
              ejemplo="«Nivel 2 — Banco de Proyectos aprobado formalmente (40%)»: al reportar el nivel 2, el valor del período es 40%."
            >
              <p>
                En 31 indicadores cualitativos, el avance se reporta eligiendo
                el <b>nivel alcanzado</b> en una escala definida en la ficha
                (planificación → inicial → intermedio → avanzado →
                optimización). Cada nivel equivale a un porcentaje; el sistema
                lo aplica automáticamente.
              </p>
            </GlosarioItem>

            <GlosarioItem
              termino="Indicador de ciclo de vida"
              ejemplo="Metas 25 / 50 / 75 / 100 / 0: en 2030 el indicador figura «Concluido», no en rojo."
            >
              <p>
                Proyectos que concluyen antes de 2030: sus metas terminan en 0
                después de alcanzar el 100%. Ese 0 final no es «meta cero» —
                la plataforma marca el período como <b>Concluido</b> y lo
                excluye del semáforo y la cobertura.
              </p>
            </GlosarioItem>

            <GlosarioItem termino="Evidencia respaldatoria">
              <p>
                Archivo que sustenta el valor reportado (PDF, imagen, Excel,
                Word o CSV, hasta 25 MB). Se adjunta en la carga, viaja con la
                medición, y el validador la descarga antes de resolver. El
                sistema guarda además una huella digital (hash) que garantiza
                que el archivo no fue alterado.
              </p>
            </GlosarioItem>

            <GlosarioItem termino="Rectificación">
              <p>
                El único camino para corregir una medición aprobada: la versión
                vigente pasa a «Rectificada» (queda archivada) y se crea una
                versión nueva en borrador que recorre el circuito completo de
                validación. Nada se sobrescribe: el tablero siempre puede
                explicar la historia de cada número.
              </p>
            </GlosarioItem>

            <GlosarioItem termino="Dependencia principal y corresponsables">
              <p>
                Cada indicador tiene una dependencia <b>principal</b> (la que
                carga y responde por el dato) y puede tener{" "}
                <b>corresponsables</b> y <b>fuentes</b> que participan de la
                gestión. El alcance de carga en la plataforma corresponde a la
                principal.
              </p>
            </GlosarioItem>

            <GlosarioItem termino="Año de referencia 2025">
              <p>
                El ejercicio previo al PEI. Sus mediciones (p. ej. el cierre
                estadístico jurisdiccional 2025) se consultan como historia y
                sirvieron para fijar líneas base, pero no tienen metas ni
                semáforo: el plan se evalúa de 2026 en adelante.
              </p>
            </GlosarioItem>
          </dl>
        </CardBody>
      </Card>
    </section>
  );
}
