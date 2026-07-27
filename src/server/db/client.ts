import { PrismaClient } from "@prisma/client";

/**
 * Factory singleton de PrismaClient por entorno de datos.
 * Máximo 2 clientes por proceso (prod/test), cacheados en globalThis para
 * sobrevivir el HMR de dev y no agotar las conexiones de TiDB Serverless
 * (connection_limit va en la propia DATABASE_URL).
 *
 * NADIE importa este módulo directamente salvo `getDb()` (src/server/db/env.ts),
 * la capa de auth (control plane = prod) y los scripts de seed.
 */
export type DbEnv = "prod" | "test";

function urlDe(env: DbEnv): string {
  const url =
    env === "prod" ? process.env.DATABASE_URL : process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error(
      `Falta la variable de entorno ${env === "prod" ? "DATABASE_URL" : "DATABASE_URL_TEST"}`,
    );
  }
  return url;
}

const g = globalThis as unknown as {
  __prismaPei?: Partial<Record<DbEnv, PrismaClient>>;
};
g.__prismaPei ??= {};

export function prismaFor(env: DbEnv): PrismaClient {
  return (g.__prismaPei![env] ??= new PrismaClient({
    datasourceUrl: urlDe(env),
  }));
}

/** Cliente del plano de control (usuarios/auth): SIEMPRE producción. */
export function prismaControl(): PrismaClient {
  return prismaFor("prod");
}
