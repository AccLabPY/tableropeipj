import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { PageHeader } from "@/ui/components/page-header";
import { Card, CardBody, CardHeader } from "@/ui/components/card";
import { BackButton } from "@/ui/components/back-button";
import { Paso } from "@/ui/features/documentacion/paso";
import { Callout } from "@/ui/features/documentacion/callout";
import { IrAPantalla } from "@/ui/features/documentacion/ir-a-pantalla";

export const metadata: Metadata = { title: "Guía de administración · Documentación" };

/**
 * Guía de administración (ADMIN y DGPD). Las secciones de usuarios,
 * estructura, presupuesto y entorno de prueba son privativas del ADMIN.
 */
export default async function GuiaDeAdministracionPage() {
  await requirePage("ADMIN", "DGPD_VALIDADOR");
  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-4">
        <BackButton />
      </div>
      <PageHeader
        title="Guía de administración"
        subtitle="Configuración de la plataforma: usuarios, matriz, umbrales, estructura, plazos, presupuesto y auditoría"
      />

      <Card>
        <CardHeader title="Tareas de administración" meta="8 secciones" />
        <CardBody>
          <Paso n={1} titulo="Usuarios, roles y sesiones (solo Administrador)">
            <p>
              En <b>Administración → Usuarios y accesos</b> se dan de alta las
              cuentas con nombre, correo institucional, contraseña inicial y
              uno o más roles. Las <b>dependencias</b> se asignan solo a quien
              tiene el rol de carga: definen qué indicadores puede reportar.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Los cambios de roles y dependencias rigen en el siguiente clic
                del usuario, sin que tenga que volver a ingresar.
              </li>
              <li>
                <b>Desactivar</b> una cuenta o <b>cambiarle la contraseña</b>{" "}
                cierra sus sesiones abiertas. También puede usar{" "}
                <b>«Cerrar sesiones del usuario»</b> sin modificar la cuenta.
              </li>
              <li>
                Las cuentas no se borran: se desactivan, para conservar la
                trazabilidad de lo que hicieron.
              </li>
              <li>
                Nadie puede desactivarse ni quitarse el rol de Administrador a
                sí mismo, y la plataforma no permite quedarse sin
                administradores activos.
              </li>
            </ul>
            <IrAPantalla href="/admin/usuarios">Ir a Usuarios y accesos</IrAPantalla>
          </Paso>

          <Paso n={2} titulo="Matriz PEI: atributos, metas y peso">
            <p>
              Permite corregir el nombre, la descripción, el sentido, la unidad,
              la línea base y su año, la fórmula y las metas 2026–2030 de cada
              indicador. Una línea base vacía marca el indicador como «a
              determinar» y lo deja sin cálculo de cumplimiento.
            </p>
            <p>
              El <b>peso</b> define la importancia del indicador dentro de su
              acción estratégica: el avance de la acción es el promedio
              ponderado de sus indicadores. Con todos los pesos en 1, cada
              indicador cuenta igual.
            </p>
            <Callout tipo="info">
              La base de producción es la fuente de verdad de la matriz: lo que
              se edita acá no se pierde. El área técnica exporta
              periódicamente la base al respaldo versionado del repositorio.
            </Callout>
            <IrAPantalla href="/admin/matriz">Ir a la Matriz PEI</IrAPantalla>
          </Paso>

          <Paso n={3} titulo="Umbrales del semáforo">
            <p>
              En <b>Escalas de criticidad</b> se fijan los porcentajes a partir
              de los cuales un indicador está en meta (verde) o en riesgo
              (amarillo). El umbral se hereda: el de un indicador pisa al de
              su acción, éste al de su objetivo y éste al global (90/70 por
              defecto). «Restablecer a heredado» elimina un umbral propio; el
              global no se puede eliminar.
            </p>
            <IrAPantalla href="/admin/escalas">Ir a Escalas de criticidad</IrAPantalla>
          </Paso>

          <Paso n={4} titulo="Estructura del PEI (solo Administrador)">
            <p>
              Alta y baja de objetivos, acciones e indicadores. Un objetivo se
              elimina solo si no tiene acciones, indicadores ni riesgos; una
              acción, solo si no tiene indicadores. Un indicador con mediciones{" "}
              <b>se desactiva</b> en lugar de borrarse: sale de los tableros y
              conserva su historial.
            </p>
            <IrAPantalla href="/admin/estructura">Ir a Estructura del PEI</IrAPantalla>
          </Paso>

          <Paso n={5} titulo="Plazos de carga">
            <p>
              El <b>plazo general</b> del ejercicio y la apertura o cierre de
              toda la carga son del Administrador. La DGPD otorga{" "}
              <b>prórrogas</b> y habilita o cierra la carga por indicador,
              dependencia, acción u objetivo. Todo acto exige un motivo, queda
              en la bitácora y notifica a las dependencias de carga alcanzadas.
            </p>
            <p>
              Las dependencias reciben avisos automáticos a 7 días y el último
              día del plazo, incluidos los del ejercicio anterior que vencen a
              principios de año.
            </p>
            <IrAPantalla href="/admin/plazos">Ir a Plazos de carga</IrAPantalla>
          </Paso>

          <Paso n={6} titulo="Ejecución presupuestaria (solo Administrador)">
            <p>
              Registra el presupuesto asignado y ejecutado del ejercicio, que
              se publica en el reporte ejecutivo. No interviene en el
              cumplimiento de los indicadores.
            </p>
            <IrAPantalla href="/admin/presupuesto">Ir a Ejecución presupuestaria</IrAPantalla>
          </Paso>

          <Paso n={7} titulo="Auditoría">
            <p>
              Cada cambio administrativo queda registrado con su autor, fecha,
              el valor anterior y el nuevo: matriz, umbrales, estructura,
              usuarios, plazos, presupuesto y cambios de entorno. La bitácora
              no se puede modificar ni borrar. Las contraseñas nunca se
              registran: solo consta que fueron cambiadas.
            </p>
            <IrAPantalla href="/admin/auditoria">Ir a Auditoría</IrAPantalla>
          </Paso>

          <Paso n={8} titulo="Entorno de prueba (solo Administrador)">
            <p>
              Desde <b>Administración</b>, un administrador puede pasar su
              propia sesión a la base de prueba, con datos de demostración en
              todos los estados del circuito, para capacitar o ensayar sin
              tocar los datos oficiales. Mientras tanto se ve el aviso{" "}
              <b>«MODO PRUEBA»</b>. Los usuarios son los mismos en ambas bases.
            </p>
            <Callout tipo="advertencia">
              Los reportes y planillas generados en modo prueba contienen datos
              de demostración: vuelva a producción antes de emitir reportes
              oficiales.
            </Callout>
            <IrAPantalla href="/admin">Ir a Administración</IrAPantalla>
          </Paso>
        </CardBody>
      </Card>
    </section>
  );
}
