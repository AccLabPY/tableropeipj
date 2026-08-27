import type { Metadata } from "next";
import { PageHeader } from "@/ui/components/page-header";
import { Card, CardBody, CardHeader } from "@/ui/components/card";
import { BackButton } from "@/ui/components/back-button";
import { Paso } from "@/ui/features/documentacion/paso";
import { Maqueta } from "@/ui/features/documentacion/maqueta";
import { Callout } from "@/ui/features/documentacion/callout";
import { IrAPantalla } from "@/ui/features/documentacion/ir-a-pantalla";

export const metadata: Metadata = {
  title: "Guía del validador · Documentación",
};

export default function GuiaDelValidadorPage() {
  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-4">
        <BackButton />
      </div>
      <PageHeader
        title="Guía del validador (DGPD)"
        subtitle="Revisión, evidencias y resolución: el control de calidad del dato oficial"
      />

      <Card>
        <CardHeader title="Walkthrough" meta="8 pasos" />
        <CardBody>
          <Paso n={1} titulo="Identifique lo pendiente de validación">
            <p>
              La <b>campanita de notificaciones</b> 🔔 le avisa de cada carga
              nueva enviada por las dependencias (y de los indicadores que
              entran en estado crítico al aprobarse): tocarla abre el detalle
              de esa carga, listo para resolver. Además, en <b>Registro</b> los
              indicadores con chip <b>Enviado</b> son su bandeja de trabajo, y{" "}
              <b>Gobernanza</b> muestra el panorama completo: cuántas
              mediciones hay en cada estado y qué dependencias están al día.
            </p>
            <IrAPantalla href="/registro">Ir a Registro</IrAPantalla>{" "}
            <IrAPantalla href="/gobernanza">Ir a Gobernanza</IrAPantalla>
          </Paso>

          <Paso n={2} titulo="Abra el detalle de la carga (el expediente)">
            <p>
              Cada carga tiene su <b>vista de detalle</b> — se llega desde la
              notificación, desde «Ver detalle de la carga» en Registro o desde
              cada versión en la ficha del indicador. En una sola pantalla:
              qué se cargó (variables, valor, fuente, observaciones), las
              evidencias con descarga, las resoluciones previas y el{" "}
              <b>historial de estados completo</b> con autor, fecha y causa de
              cada transición. El panel <b>«Resolución de la DGPD»</b> de esa
              misma pantalla permite tomar en revisión, aprobar, observar,
              rechazar o rectificar sin cambiar de vista (solo sobre la última
              versión).
            </p>
          </Paso>

          <Paso n={3} titulo="Revise el valor y sus variables">
            <p>
              El panel «Validación DGPD» muestra el valor cargado y su versión.
              Verifique el desglose: las variables (a), (b), (c) que informó la
              dependencia, la fuente declarada y las observaciones. El valor
              observado siempre fue recalculado por el sistema a partir de las
              variables — lo que usted valida es que <b>los datos base sean
              correctos y estén respaldados</b>.
            </p>
          </Paso>

          <Paso n={4} titulo="Descargue y revise las evidencias">
            <p>
              Antes de resolver, el panel lista las evidencias respaldatorias
              con su botón <b>Descargar</b>. Coteje que el archivo respalde
              efectivamente el valor reportado (período, cobertura y cifras).
            </p>
            <Maqueta titulo="Validación DGPD · evidencias">
              <div className="flex items-center justify-between rounded-pj-sm border border-linea bg-superficie px-3 py-2">
                <div>
                  <div className="text-[12px] font-medium">
                    memoria-anual-2025.pdf
                  </div>
                  <div className="text-[10.5px] text-muted">2,4 MB · 04/08/2026</div>
                </div>
                <span className="rounded-pj-sm border border-azul-line bg-azul-soft px-[9px] py-[4px] text-[11px] font-semibold text-azul-d">
                  Descargar
                </span>
              </div>
            </Maqueta>
            <Callout tipo="advertencia">
              Una medición sin evidencia suficiente debería <b>observarse</b>,
              no aprobarse: solo lo aprobado alimenta los tableros oficiales.
            </Callout>
          </Paso>

          <Paso n={5} titulo="Opcional: tome la medición en revisión">
            <p>
              El botón <b>«Tomar en revisión»</b> marca que usted está
              analizando esa medición (estado «En revisión»). Es útil cuando la
              revisión lleva tiempo o hay varios validadores; también puede
              resolver directamente desde «Enviado».
            </p>
          </Paso>

          <Paso n={6} titulo="Resuelva: aprobar u observar">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <b>Aprobar</b> — el valor se publica en los tableros oficiales
                y cuenta para la cobertura del período.
              </li>
              <li>
                <b>Observar</b> — devuelve la medición a la dependencia para
                corrección. El comentario es obligatorio: sea específico sobre
                qué corregir.
              </li>
            </ul>
            <Callout tipo="info">
              El <b>rechazo se retiró del circuito</b> (2026): una carga
              incorrecta se observa para que la dependencia la corrija, de modo
              que ningún indicador quede sin dato por una resolución terminal.
            </Callout>
            <p>
              Si la carga tiene adjuntos que no corresponden, puede{" "}
              <b>eliminarlos</b> desde el panel de evidencias mientras la
              medición no esté aprobada.
            </p>
            <p>
              Cada resolución queda firmada con su usuario, fecha y comentario
              en el historial inmutable de la medición, y{" "}
              <b>notifica automáticamente a la dependencia</b> en su campanita
              (con el comentario incluido). Si al aprobar el indicador queda en
              semáforo crítico, el sistema emite además una alerta a
              validadores y a la dependencia responsable.
            </p>
          </Paso>

          <Paso n={7} titulo="Plazos: prórrogas, habilitación y cierre">
            <p>
              Cada indicador tiene una ventana de carga que se cierra sola al
              vencer el plazo del ejercicio. Desde el panel «Resolución de la
              DGPD» —en Registro o en el detalle de la carga— usted puede:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <b>Prórroga</b> — extiende la fecha límite con el alcance que
                elija: solo ese indicador, toda la dependencia, la acción o el
                objetivo completo.
              </li>
              <li>
                <b>Cerrar carga</b> — bloquea anticipadamente la carga (por
                ejemplo, tras el corte de datos del período).
              </li>
              <li>
                <b>Habilitar carga</b> — reabre lo que estaba cerrado o vencido.
              </li>
            </ul>
            <p>
              Todo acto queda registrado con autor y motivo en{" "}
              <b>Administración → Plazos de carga</b>, y la dependencia recibe
              la notificación correspondiente. La puntualidad de cada
              dependencia se mide en <b>Gobernanza → SLA de carga</b>.
            </p>
            <IrAPantalla href="/admin/plazos">Ir a Plazos de carga</IrAPantalla>{" "}
            <IrAPantalla href="/gobernanza">Ver SLA de carga</IrAPantalla>
          </Paso>

          <Paso n={8} titulo="Rectificación de una aprobada">
            <p>
              Si una medición aprobada resulta errónea, use{" "}
              <b>Rectificar</b> (disponible en el detalle de la carga
              aprobada): la versión vigente pasa a «Rectificada» (queda
              archivada, visible en el historial) y se crea la versión
              siguiente en borrador para que la dependencia corrija y reenvíe.
              Los tableros dejan de contar el valor rectificado hasta que la
              nueva versión sea aprobada.
            </p>
            <Callout tipo="tip">
              La regla de oro del modelo: <b>nada se sobrescribe ni se
              borra</b>. Toda corrección es una versión nueva con su propia
              validación — así el tablero siempre puede explicar de dónde salió
              cada número.
            </Callout>
          </Paso>
        </CardBody>
      </Card>
    </section>
  );
}
