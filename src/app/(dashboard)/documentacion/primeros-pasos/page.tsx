import type { Metadata } from "next";
import { PageHeader } from "@/ui/components/page-header";
import { Card, CardBody, CardHeader, Tag } from "@/ui/components/card";
import { BackButton } from "@/ui/components/back-button";
import { Paso } from "@/ui/features/documentacion/paso";
import { Callout } from "@/ui/features/documentacion/callout";
import { IrAPantalla } from "@/ui/features/documentacion/ir-a-pantalla";

export const metadata: Metadata = { title: "Primeros pasos · Documentación" };

const ROLES = [
  {
    rol: "Consulta",
    ve: "Tableros ejecutivo, objetivos, acciones, indicadores y gobernanza (solo lectura).",
  },
  {
    rol: "Autoridad",
    ve: "Igual que Consulta: visión total del avance del PEI para la toma de decisiones.",
  },
  {
    rol: "Carga de dependencia",
    ve: "Todo lo anterior + la pantalla de Registro con los indicadores de SUS dependencias, donde carga avances y evidencias.",
  },
  {
    rol: "Validador DGPD",
    ve: "Visión total + resolución de cargas (aprobar u observar), prórrogas y cierre de la carga + Administración de matriz, escalas y plazos.",
  },
  {
    rol: "Administrador",
    ve: "Todo + gestión de usuarios, estructura del PEI (alta/baja de objetivos, acciones e indicadores), plazos de carga, presupuesto y modo prueba.",
  },
] as const;

export default function PrimerosPasosPage() {
  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-4">
        <BackButton />
      </div>
      <PageHeader
        title="Primeros pasos"
        subtitle="Cómo entrar, qué ve cada rol y cómo moverse por la plataforma"
      />

      <Card>
        <CardHeader title="Guía" meta="7 pasos" />
        <CardBody>
          <Paso n={1} titulo="Inicie sesión con su correo institucional">
            <p>
              El acceso es individual: cada persona tiene su propia cuenta con
              correo institucional y contraseña. Todo lo que usted haga (cargar,
              enviar, validar) queda registrado a su nombre en el historial de
              auditoría.
            </p>
            <Callout tipo="advertencia">
              No comparta su cuenta. Si necesita un usuario nuevo para su
              dependencia, solicítelo a la DGPD.
            </Callout>
          </Paso>

          <Paso n={2} titulo="Conozca su rol">
            <p>
              Lo que usted puede ver y hacer depende del rol asignado a su
              cuenta:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="bg-zebra text-left text-2xs uppercase tracking-[.06em] text-muted">
                    <th className="border-b border-linea px-3 py-2">Rol</th>
                    <th className="border-b border-linea px-3 py-2">
                      Qué ve y qué puede hacer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((r) => (
                    <tr key={r.rol}>
                      <td className="whitespace-nowrap border-b border-linea-2 px-3 py-2 font-semibold">
                        {r.rol}
                      </td>
                      <td className="border-b border-linea-2 px-3 py-2 text-muted">
                        {r.ve}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Paso>

          <Paso n={3} titulo="Navegue con el menú lateral">
            <p>
              En computadora, el menú está siempre visible a la izquierda,
              agrupado en <b>Seguimiento</b> (tableros de consulta),{" "}
              <b>Registro</b> (carga de avances), <b>Configuración</b>{" "}
              (administración) y <b>Ayuda</b> (esta documentación). En el
              celular, ábralo con el botón ☰ de la barra superior — la
              plataforma es 100% usable desde el móvil.
            </p>
            <IrAPantalla href="/ejecutivo">Ir al Tablero ejecutivo</IrAPantalla>
          </Paso>

          <Paso n={4} titulo="Elija el ejercicio (año)">
            <p>
              Casi todas las pantallas tienen el selector <Tag>Ejercicio</Tag>{" "}
              arriba a la derecha. El PEI abarca 2026–2030; además existe{" "}
              <b>2025 (ref.)</b>, el año de cierre previo al plan: sus valores
              se muestran como referencia histórica y línea base, sin
              cumplimiento (no hay metas 2025).
            </p>
          </Paso>

          <Paso n={5} titulo="Atienda la campanita de notificaciones">
            <p>
              Arriba a la derecha, la <b>campanita 🔔</b> concentra las
              novedades que le conciernen: si usted carga datos, cada cambio
              de estado de sus cargas (tomada en revisión, aprobada, observada,
              rechazada, rectificada); si valida, cada carga nueva enviada por
              las dependencias y las alertas de <b>indicadores en estado
              crítico</b>. El número rojo indica cuántas no leyó; al tocar una
              notificación se abre directamente el detalle correspondiente.
            </p>
          </Paso>

          <Paso n={6} titulo="Elija su interfaz: Agentes PEI o Clásico">
            <p>
              El conmutador de la barra superior alterna entre el tema{" "}
              <b>Agentes PEI</b> (moderno, con la identidad del programa) y el{" "}
              <b>Clásico</b> institucional. La elección se guarda en su cuenta
              y lo acompaña en cualquier dispositivo. Los reportes imprimibles
              salen siempre con el formato Clásico institucional.
            </p>
          </Paso>

          <Paso n={7} titulo="Modo prueba (solo administradores)">
            <p>
              El Administrador puede conmutar su sesión a una base de{" "}
              <b>prueba</b> con datos ficticios, ideal para capacitación: verá
              un banner permanente «MODO PRUEBA». Los demás usuarios siempre
              ven los datos oficiales — nada de lo que se haga en modo prueba
              afecta al tablero real.
            </p>
            <Callout tipo="tip">
              ¿Primera vez cargando un avance? Pida al Administrador practicar
              en modo prueba antes de tocar los datos oficiales.
            </Callout>
          </Paso>
        </CardBody>
      </Card>
    </section>
  );
}
