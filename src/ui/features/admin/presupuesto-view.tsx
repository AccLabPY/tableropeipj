"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import {
  guardarPresupuestoAction,
  type ResultadoPlazo,
} from "@/server/services/plazos-actions";
import { Card, CardBody, CardHeader } from "@/ui/components/card";
import { ModalResultado } from "@/ui/components/modal-resultado";
import { Spinner } from "@/ui/components/spinner";
import { BarraPresupuesto } from "@/ui/features/reportes/barra-presupuesto";

const fmtGs = (n: number) => `${new Intl.NumberFormat("es-PY").format(n)} Gs.`;

/** Carga de la ejecución presupuestaria del ejercicio (Reporte Ejecutivo). */
export function PresupuestoView({
  anio,
  asignado,
  ejecutado,
}: {
  anio: number;
  asignado: number | null;
  ejecutado: number | null;
}) {
  const router = useRouter();
  const [a, setA] = useState(asignado !== null ? String(asignado) : "");
  const [e, setE] = useState(ejecutado !== null ? String(ejecutado) : "");
  const [toast, setToast] = useState<ResultadoPlazo | null>(null);
  const [pendiente, start] = useTransition();

  const nA = Number(a) || 0;
  const nE = Number(e) || 0;
  const pct = nA > 0 ? nE / nA : null;

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Ejercicio ${anio}`} meta="montos en guaraníes" />
          <CardBody className="space-y-3">
            <label className="block text-2xs uppercase tracking-[.06em] text-muted">
              Presupuesto asignado
              <input
                inputMode="numeric"
                value={a}
                onChange={(ev) => setA(ev.target.value.replace(/[^\d.]/g, ""))}
                placeholder="1787596520351"
                className="tnum mt-1 block w-full rounded-pj border border-linea bg-superficie px-3 py-2 text-[14px] text-tinta"
              />
              {nA > 0 ? (
                <span className="mt-1 block text-[11px] normal-case tracking-normal text-muted">
                  {fmtGs(nA)}
                </span>
              ) : null}
            </label>
            <label className="block text-2xs uppercase tracking-[.06em] text-muted">
              Presupuesto ejecutado
              <input
                inputMode="numeric"
                value={e}
                onChange={(ev) => setE(ev.target.value.replace(/[^\d.]/g, ""))}
                placeholder="1581633582639"
                className="tnum mt-1 block w-full rounded-pj border border-linea bg-superficie px-3 py-2 text-[14px] text-tinta"
              />
              {nE > 0 ? (
                <span className="mt-1 block text-[11px] normal-case tracking-normal text-muted">
                  {fmtGs(nE)}
                </span>
              ) : null}
            </label>
            <button
              type="button"
              disabled={pendiente}
              onClick={() =>
                start(async () => {
                  const r = await guardarPresupuestoAction({
                    anio,
                    asignado: nA,
                    ejecutado: nE,
                  });
                  setToast(r);
                  if (r.ok) router.refresh();
                })
              }
              className="tap inline-flex items-center gap-[6px] rounded-pj bg-azul px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-azul-d disabled:opacity-60 agentes:rounded-chip"
            >
              {pendiente ? <Spinner /> : <Save className="h-4 w-4" />}
              Guardar
            </button>
            <p className="text-[11.5px] text-muted">
              Estos montos se publican en el <b>Reporte ejecutivo</b> del
              ejercicio, con su porcentaje de ejecución y el gráfico
              comparativo. No afectan el cumplimiento de los indicadores.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Vista previa del reporte" meta="así se imprimirá" />
          <CardBody>
            {nA > 0 ? (
              <BarraPresupuesto asignado={nA} ejecutado={nE} anio={anio} />
            ) : (
              <p className="text-[12.5px] text-muted">
                Cargue el presupuesto asignado para ver la vista previa.
              </p>
            )}
            {pct !== null ? (
              <p className="mt-3 text-[12px] text-muted">
                Porcentaje de ejecución presupuestaria:{" "}
                <b className="text-tinta">{Math.round(pct * 100)}%</b>
              </p>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <ModalResultado
        abierto={toast !== null}
        tipo={toast?.ok ? "exito" : "error"}
        mensaje={toast?.mensaje}
        alCerrar={() => setToast(null)}
      />
    </>
  );
}
