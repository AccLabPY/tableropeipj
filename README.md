# Plataforma de Seguimiento del PEI 2026–2030

**Corte Suprema de Justicia del Paraguay — Poder Judicial**

Seguimiento del cumplimiento de los **89 indicadores** del Plan Estratégico
Institucional 2026–2030: captura de mediciones por dependencia, validación por
flujo de estados (DGPD) y tableros analíticos con cumplimiento **normalizado
por sentido y línea base**.

## Invariantes del sistema

1. El cumplimiento NUNCA es `valor/meta`: se normaliza por sentido (ASC/DESC)
   y línea base (`src/domain/cumplimiento.ts`, tests golden en
   `src/domain/__tests__`). Prueba de oro: 4202 (base 18.87, meta 20, valor
   19.5) ⇒ **55,7% Rojo**; 3201 (100/95/96 DESC) ⇒ **80% Amarillo**.
2. Solo las mediciones **APROBADAS** alimentan los tableros oficiales.
3. La cobertura de reporte siempre acompaña al cumplimiento.
4. Historial **append-only**: una aprobada no se sobrescribe; rectificar crea
   versión nueva.
5. Umbrales de semáforo configurables con herencia
   Indicador → AE → OE → Global.
6. Jerarquía visible OE → **Acción Estratégica** → Indicador.

## Stack

Next.js 14 (App Router) · TypeScript estricto · Tailwind · Recharts ·
Prisma (`mysql`, `relationMode="prisma"`) · TiDB Serverless · Auth.js v5
(credenciales + JWT + RBAC) · Vitest.

## Dos bases de datos (switch desde Admin)

| Base | Uso | Mediciones |
|---|---|---|
| `peipj` | producción (datos oficiales) | las que cargue la institución |
| `peipj_test` | demo/capacitación | mockup sembrado en todos los estados |

Un **ADMIN** puede alternar su sesión entre ambas desde *Administración*
(banner "MODO PRUEBA" siempre visible). Los demás roles ven `DB_DEFAULT_ENV`.
La autenticación siempre ocurre contra `peipj` (plano de control).

## Puesta en marcha (desarrollo)

```bash
cp .env.example .env      # completar credenciales (ver abajo)
npm install
npm run data:verify       # valida el dataset canónico: 6 OE / 39 AE / 89 ind.
npm run db:setup:all      # push + seed de ambas databases (idempotente)
npm run dev               # http://localhost:3000
```

En dev conviene `DB_DEFAULT_ENV=test` para no tocar producción por error.

### Usuarios demo (seed) — contraseña `pei2026`

| Email | Rol |
|---|---|
| `admin@pj.gov.py` | ADMIN (switch de DB, usuarios, matriz) |
| `dgpd@pj.gov.py` | DGPD_VALIDADOR (valida mediciones) |
| `carga.dgch@pj.gov.py` | DEPENDENCIA_CARGA (Capital Humano) |
| `carga.dgtic@pj.gov.py` | DEPENDENCIA_CARGA (DGTIC) |
| `carga.estadisticas@pj.gov.py` | DEPENDENCIA_CARGA (Estadísticas) |
| `autoridad@pj.gov.py` | AUTORIDAD (solo lectura total) |
| `consulta@pj.gov.py` | CONSULTA (solo lectura) |

> ⚠ **Seguridad**: cambiar estas claves en producción y **rotar la
> contraseña del usuario de TiDB** (las credenciales iniciales circularon por
> chat). Ver `docs/deploy-render.md` §5.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | ciclo Next.js |
| `npm run test` · `test:domain` | Vitest (motor de cumplimiento + contratos) |
| `npm run typecheck` · `lint` | calidad |
| `npm run data:verify` | valida `prisma/data/*.json` (89 indicadores) |
| `npm run db:push:prod` / `db:push:test` | sincroniza esquema |
| `npm run db:seed:prod` / `db:seed:test` | seed idempotente (test += mockup) |
| `npm run db:setup:all` | todo lo anterior en orden |
| `npm run db:studio:prod` / `db:studio:test` | Prisma Studio |

## Estructura

```
prisma/data/     dataset canónico versionado (fuentes y precedencia: NOTAS.md)
src/domain/      motor de cumplimiento PURO (sin Prisma/Next/React) + tests
src/shared/      DTOs planos + schemas Zod + constantes
src/server/      db (factory + switch) · auth (guards/RBAC) · repositories
                 (scoping) · services (casos de uso + mappers) · api (envelope)
src/app/         (auth)/login · (dashboard)/{ejecutivo,objetivos,acciones,
                 indicadores,gobernanza,registro,admin} · api/v1 · api/health
src/ui/          layout · components · charts (client-only) · features · theme
```

Reglas de módulos: `domain` no importa nada; `server` no importa React; la UI
no importa `@prisma/client` (regla ESLint) — los Decimal/BigInt mueren en
`src/server/services/mappers.ts`.

## API v1 (envelope `{data, meta?, error?}`)

`GET /api/v1/dashboards/ejecutivo?anio` · `GET /api/v1/objetivos` ·
`GET /api/v1/indicadores?oe&estado&q&page` · `GET /api/v1/indicadores/:codigo`
· `GET|POST /api/v1/mediciones` · `POST /api/v1/mediciones/:id/{enviar,
validar,rectificar,evidencias}` · `GET /api/health`.

## Rendimiento

TiDB está en us-east-1 (~200 ms por round-trip desde Paraguay), por lo que la
plataforma cachea agresivamente en memoria (`src/server/services/cache.ts`):

- **Estado del PEI, catálogo, umbrales y fichas** con TTL +
  *stale-while-revalidate*: las navegaciones en caliente responden en
  **60–120 ms** sin tocar la base.
- **Warm-up al arrancar** (`src/instrumentation.ts`): el servidor precalienta
  ambas bases en background; el primer visitante no paga el cómputo frío.
- **Invalidación explícita**: aprobar/observar mediciones, editar la matriz o
  cambiar umbrales limpian el caché al instante (los tableros nunca muestran
  datos viejos tras una mutación). TTL corto (60 s) acota el desfase entre
  instancias en despliegues multi-nodo.

> Para juzgar la velocidad usar `npm run build && npm start`: `npm run dev`
> compila cada ruta en el primer acceso y siempre se siente más lento.

## Deploy

Preparado para **Render + TiDB** (no ejecutado): `render.yaml` +
`docs/deploy-render.md`. Portabilidad Fase B (PostgreSQL on-premise del PJ):
cambiar el `provider` de Prisma; el cálculo vive en dominio TS, sin SQL crudo.

## Fuera de alcance de esta fase

Importación ETL de Excel (endpoint + plantilla), e2e Playwright completo,
LDAP institucional. El diseño ya los contempla (ver prompt maestro §12/§14).
