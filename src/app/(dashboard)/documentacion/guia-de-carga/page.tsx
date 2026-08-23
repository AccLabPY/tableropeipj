import type { Metadata } from "next";
import { PageHeader } from "@/ui/components/page-header";
import { Card, CardBody, CardHeader } from "@/ui/components/card";
import { BackButton } from "@/ui/components/back-button";
import { Paso } from "@/ui/features/documentacion/paso";
import { Maqueta } from "@/ui/features/documentacion/maqueta";
import { Callout } from "@/ui/features/documentacion/callout";
import { IrAPantalla } from "@/ui/features/documentacion/ir-a-pantalla";

export const metadata: Metadata = {
  title: "Guía de carga de avances · Documentación",
};

/** Chip de estado ilustrativo (mismo estilo que la worklist real). */
function ChipDemo({ cls, children }: { cls: string; children: string }) {
  return (
    <span
      className={`rounded-chip px-[7px] py-[1px] text-[10px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function InputDemo({ label, valor, ancho }: { label: string; valor: string; ancho?: boolean }) {
  return (
    <label className={`block text-2xs uppercase tracking-[.06em] text-muted ${ancho ? "sm:col-span-2" : ""}`}>
      {label}
      <input
        disabled
        value={valor}
        className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[12.5px] normal-case tracking-normal text-tinta"
      />
    </label>
  );
}

export default function GuiaDeCargaPage() {
  return (
    <section className="mx-auto max-w-3xl">
      <BackButton />
      <PageHeader
        title="Guía de carga de avances"
        subtitle="Para las dependencias responsables: del valor observado a la validación de la DGPD"
      />

      <Card>
        <CardHeader title="Walkthrough" meta="8 pasos" />
        <CardBody>
          <Paso n={1} titulo="Abra Registro y elija el indicador">
            <p>
              En <b>Registro → Carga de avances</b> verá su lista de trabajo:
              solo los indicadores cuya dependencia responsable es la suya. El
              chip de cada uno indica en qué punto del circuito está:
            </p>
            <Maqueta titulo="Indicadores a cargo">
              <ul className="space-y-2">
                <li className="flex items-center justify-between rounded-pj-sm border border-linea px-3 py-2">
                  <span className="text-[12px]">4102 · Personas que accedieron por concurso</span>
                  <ChipDemo cls="bg-sem-gris-bg text-muted">Pendiente</ChipDemo>
                </li>
                <li className="flex items-center justify-between rounded-pj-sm border border-linea px-3 py-2">
                  <span className="text-[12px]">4202 · Funcionarios evaluados anualmente</span>
                  <ChipDemo cls="bg-sem-ambar-bg text-sem-ambar-fg">Borrador</ChipDemo>
                </li>
                <li className="flex items-center justify-between rounded-pj-sm border border-linea px-3 py-2">
                  <span className="text-[12px]">4401 · Índice de satisfacción del clima laboral</span>
                  <ChipDemo cls="bg-azul-soft text-azul-d">Enviado</ChipDemo>
                </li>
              </ul>
            </Maqueta>
            <IrAPantalla href="/registro">Ir a Carga de avances</IrAPantalla>
          </Paso>

          <Paso n={2} titulo="Lea «Cómo se calcula» antes de cargar">
            <p>
              Cada indicador muestra su fórmula oficial y la descripción de
              cada variable, tomadas de la ficha técnica. Usted{" "}
              <b>nunca calcula el resultado</b>: carga los datos base y el
              sistema aplica la fórmula.
            </p>
          </Paso>

          <Paso n={3} titulo="Cargue las variables (o el nivel de escala)">
            <p>El formulario se adapta al tipo de indicador:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <b>Fórmulas con variables (a), (b), (c)</b> — un campo por
                variable, con su descripción. Ej.: (a) casos resueltos, (b)
                casos ingresados.
              </li>
              <li>
                <b>Valor directo</b> — un único campo (sumatorias, puntajes,
                metros cuadrados).
              </li>
              <li>
                <b>Escala de avance</b> — un selector con los niveles
                cualitativos de la ficha; el % del nivel elegido es el valor
                del período.
              </li>
            </ul>
            <Maqueta titulo="Registro · fórmula (a) / (b) × 100">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InputDemo label="(a) Funcionarios evaluados" valor="1.874" />
                <InputDemo label="(b) Total de funcionarios" valor="9.930" />
                <label className="block text-2xs uppercase tracking-[.06em] text-muted sm:col-span-2">
                  Valor observado (calculado automáticamente)
                  <input
                    disabled
                    value="18,87 %"
                    className="mt-1 block w-full rounded-pj border border-linea bg-hover px-[9px] py-2 text-[12.5px] font-semibold normal-case tracking-normal text-tinta"
                  />
                </label>
              </div>
            </Maqueta>
            <Callout tipo="info">
              El cumplimiento estimado y el semáforo se muestran en vivo
              mientras escribe, con la misma fórmula que usará el tablero
              oficial. El servidor recalcula siempre: aunque el navegador
              mostrara otra cosa, el valor persistido sale de las variables.
            </Callout>
          </Paso>

          <Paso n={4} titulo="Complete la fuente / medio de verificación">
            <p>
              Indique el documento que respalda el dato: informe, acta,
              memoria, planilla o reporte estadístico. Este texto acompaña a la
              medición en la ficha del indicador y en los reportes.
            </p>
          </Paso>

          <Paso n={5} titulo="Adjunte las evidencias respaldatorias">
            <p>
              Suba los archivos que sustentan el valor (PDF, imagen, Excel,
              Word o CSV — hasta 25 MB cada uno). Si aún no guardó el borrador,
              no se preocupe: <b>al adjuntar, el sistema guarda el borrador
              automáticamente</b> y sube el archivo en un solo paso. El
              validador de la DGPD descargará estos archivos antes de aprobar.
            </p>
            <Callout tipo="advertencia">
              Los adjuntos solo pueden eliminarse mientras la medición sigue en
              borrador u observada. Una vez enviada, el expediente queda
              íntegro.
            </Callout>
          </Paso>

          <Paso n={6} titulo="Guarde el borrador… o envíe a validación">
            <p>
              <b>«Guardar borrador»</b> conserva su carga sin exponerla: puede
              volver a editarla cuando quiera y aún no aparece en ningún
              tablero. <b>«Enviar a validación»</b> la remite a la DGPD; desde
              ese momento ya no es editable hasta la resolución.
            </p>
          </Paso>

          <Paso n={7} titulo="Qué pasa después del envío">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <b>Aprobada</b> — el valor pasa a alimentar los tableros
                oficiales del PEI.
              </li>
              <li>
                <b>Observada</b> — vuelve a usted con el comentario del
                validador: corrija lo señalado y reenvíe (el circuito completo
                queda en el historial).
              </li>
              <li>
                <b>Rechazada</b> — la medición no procede para el período; el
                comentario del validador explica el motivo.
              </li>
            </ul>
          </Paso>

          <Paso n={8} titulo="¿Se aprobó con un error? Rectificación">
            <p>
              Una medición aprobada nunca se edita ni se borra. Si detecta un
              error, solicite la <b>rectificación</b> a la DGPD: la versión
              aprobada queda archivada como «Rectificada» y se abre una nueva
              versión en borrador para corregir — trazabilidad completa, sin
              reescribir la historia.
            </p>
          </Paso>
        </CardBody>
      </Card>
    </section>
  );
}
