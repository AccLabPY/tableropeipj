/**
 * Warm-up al arrancar el servidor (Next instrumentation hook):
 * precalienta las conexiones a TiDB y el caché del estado del PEI para que
 * el PRIMER visitante no pague los ~10 round-trips a us-east-1.
 * Corre en background: no bloquea el arranque ni rompe si la base no responde.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  setTimeout(async () => {
    try {
      const { prismaFor } = await import("@/server/db/client");
      const { calcularEstadoPEI } = await import(
        "@/server/services/estado-pei.service"
      );
      const { conTTL, TTL_CORTO } = await import("@/server/services/cache");

      const actorSistema = {
        userId: 0,
        nombre: "warmup",
        email: "",
        roles: ["CONSULTA" as const],
        dependenciaIds: [],
      };
      const anio = 2026;
      const envs = ["prod", "test"] as const;

      await Promise.allSettled(
        envs.map(async (env) => {
          const ctx = { db: prismaFor(env), env, actor: actorSistema };
          const t0 = Date.now();
          await conTTL("estado", `${env}:${anio}`, TTL_CORTO, true, () =>
            calcularEstadoPEI(ctx, anio),
          );
          console.log(
            `[warmup] estado PEI ${env}:${anio} listo en ${Date.now() - t0} ms`,
          );
        }),
      );
    } catch (e) {
      console.error("[warmup] falló (no crítico):", e);
    }
  }, 0);
}
