import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { requirePage } from "@/server/auth/guards";
import {
  ETIQUETA_ACCION,
  listarAuditoria,
  type AccionAuditoria,
} from "@/server/services/auditoria.service";
import { PageHeader } from "@/ui/components/page-header";
import { BackButton } from "@/ui/components/back-button";
import { Card, CardHeader } from "@/ui/components/card";

export const metadata: Metadata = { title: "Auditoría administrativa" };
export const dynamic = "force-dynamic";

const POR_PAGINA = 50;

const Filtros = z.object({
  accion: z.string().max(40).optional().catch(undefined),
  usuario: z.string().trim().max(160).optional().catch(undefined),
  entidad: z.string().max(40).optional().catch(undefined),
  env: z.enum(["prod", "test"]).optional().catch(undefined),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  antesDe: z.string().regex(/^\d+$/).optional().catch(undefined),
});

const ENTIDADES = [
  "Indicador",
  "ObjetivoEstrategico",
  "AccionEstrategica",
  "UmbralCriticidad",
  "Usuario",
  "VentanaCarga",
  "Periodo",
  "PresupuestoEjercicio",
  "Sesion",
];

const fmtFechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Asuncion",
  });

/** Claves cuyo valor cambió entre antes y después (para resaltar). */
function cambios(antes: unknown, despues: unknown): string[] {
  const a = (antes && typeof antes === "object" ? antes : {}) as Record<string, unknown>;
  const d = (despues && typeof despues === "object" ? despues : {}) as Record<string, unknown>;
  const claves = new Set([...Object.keys(a), ...Object.keys(d)]);
  return [...claves].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(d[k]));
}

function Valor({ v }: { v: unknown }) {
  if (v === null || v === undefined) return <span className="text-muted-2">—</span>;
  return (
    <code className="break-all text-[11px]">
      {typeof v === "string" ? v : JSON.stringify(v)}
    </code>
  );
}

/**
 * Bitácora de cambios administrativos (solo lectura). Vive en la base de
 * control; cada fila indica sobre qué entorno de datos se actuó.
 */
export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  await requirePage("ADMIN", "DGPD_VALIDADOR");
  const f = Filtros.parse(searchParams);

  const { filas: pagina, hayMas } = await listarAuditoria(f, POR_PAGINA);

  const sinCursor = { ...searchParams, antesDe: undefined };
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sinCursor, ...extra })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  const campo =
    "mt-1 block w-full rounded-pj border border-linea bg-superficie px-[9px] py-[7px] text-[12.5px] normal-case tracking-normal text-tinta";
  const etiqueta = "text-2xs uppercase tracking-[.06em] text-muted";

  return (
    <section>
      <div className="mb-4">
        <BackButton />
      </div>
      <PageHeader
        title="Auditoría administrativa"
        subtitle="Cambios en la matriz, umbrales, estructura, usuarios, plazos, presupuesto y entorno de datos: quién, cuándo, antes y después"
      />

      <Card className="mb-4">
        <form method="get" className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <label className={etiqueta}>
            Acción
            <select id="f-accion" name="accion" defaultValue={f.accion ?? ""} className={campo}>
              <option value="">Todas</option>
              {(Object.keys(ETIQUETA_ACCION) as AccionAuditoria[]).map((a) => (
                <option key={a} value={a}>
                  {ETIQUETA_ACCION[a]}
                </option>
              ))}
            </select>
          </label>
          <label className={etiqueta}>
            Entidad
            <select id="f-entidad" name="entidad" defaultValue={f.entidad ?? ""} className={campo}>
              <option value="">Todas</option>
              {ENTIDADES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
          <label className={etiqueta}>
            Usuario (correo)
            <input id="f-usuario" name="usuario" defaultValue={f.usuario ?? ""} className={campo} />
          </label>
          <label className={etiqueta}>
            Entorno
            <select id="f-env" name="env" defaultValue={f.env ?? ""} className={campo}>
              <option value="">Ambos</option>
              <option value="prod">Producción</option>
              <option value="test">Prueba</option>
            </select>
          </label>
          <label className={etiqueta}>
            Desde
            <input id="f-desde" type="date" name="desde" defaultValue={f.desde ?? ""} className={campo} />
          </label>
          <label className={etiqueta}>
            Hasta
            <input id="f-hasta" type="date" name="hasta" defaultValue={f.hasta ?? ""} className={campo} />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
            <button
              type="submit"
              className="tap rounded-pj border border-azul-d bg-azul px-4 py-[7px] text-[12.5px] font-semibold text-white hover:bg-azul-d"
            >
              Filtrar
            </button>
            <Link
              href="/admin/auditoria"
              className="rounded-pj border border-linea bg-superficie px-4 py-[7px] text-[12.5px] font-semibold hover:bg-hover"
            >
              Limpiar
            </Link>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Registro de cambios"
          meta={pagina.length ? `${pagina.length} más recientes${hayMas ? " · hay más" : ""}` : "sin resultados"}
        />
        {pagina.length === 0 ? (
          <p className="p-4 text-[12.5px] text-muted">
            No hay cambios registrados con esos filtros.
          </p>
        ) : (
          <ul className="divide-y divide-linea">
            {pagina.map((r) => {
              const claves = cambios(r.antes, r.despues);
              const antes = (r.antes ?? {}) as Record<string, unknown>;
              const despues = (r.despues ?? {}) as Record<string, unknown>;
              return (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12.5px]">
                    <span className="tnum text-muted">{fmtFechaHora(r.fecha)}</span>
                    <b className="text-tinta">
                      {ETIQUETA_ACCION[r.accion as AccionAuditoria] ?? r.accion}
                    </b>
                    <span className="text-muted">
                      {r.entidad}
                      {r.entidadId ? ` ${r.entidadId}` : ""}
                    </span>
                    <span className="text-muted">· {r.usuarioEmail}</span>
                    {r.env === "test" ? (
                      <span className="rounded-chip bg-sem-ambar-bg px-2 py-[1px] text-[10.5px] font-semibold text-sem-ambar-fg">
                        base de prueba
                      </span>
                    ) : null}
                  </div>
                  {r.motivo ? (
                    <p className="mt-1 text-[12px] text-muted">Motivo: “{r.motivo}”</p>
                  ) : null}
                  {claves.length ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11.5px] font-semibold text-azul-d">
                        {claves.length} {claves.length === 1 ? "campo" : "campos"}: {claves.join(", ")}
                      </summary>
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-left text-[11.5px]">
                          <thead>
                            <tr className="text-muted">
                              <th className="py-1 pr-3 font-semibold">Campo</th>
                              <th className="py-1 pr-3 font-semibold">Antes</th>
                              <th className="py-1 font-semibold">Después</th>
                            </tr>
                          </thead>
                          <tbody>
                            {claves.map((k) => (
                              <tr key={k} className="border-t border-linea-2 align-top">
                                <td className="py-1 pr-3 font-semibold">{k}</td>
                                <td className="py-1 pr-3">
                                  <Valor v={antes[k]} />
                                </td>
                                <td className="py-1">
                                  <Valor v={despues[k]} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {hayMas ? (
          <div className="border-t border-linea px-4 py-3">
            <Link
              href={`/admin/auditoria${qs({ antesDe: pagina[pagina.length - 1]!.id })}`}
              className="text-[12.5px] font-semibold text-azul hover:underline"
            >
              Ver cambios anteriores →
            </Link>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
