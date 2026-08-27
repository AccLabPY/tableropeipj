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

## Plazos de carga, prórrogas y SLA

Ventana de carga por indicador (`src/domain/plazos.ts`, dominio puro y testeado;
`plazos.service.ts` en la capa de aplicación):

- **Plazo**: `Periodo.fechaLimiteCarga` fija el vencimiento general del
  ejercicio (Administración → Plazos de carga). Cada acto administrativo
  posterior se registra append-only en `VentanaCarga` con alcance
  **GLOBAL / OE / AE / INDICADOR / DEPENDENCIA**, autor y motivo.
- **Resolución**: la fecha efectiva es la **más tardía** aplicable (una
  prórroga nunca acorta un plazo); un acto manual posterior (APERTURA/CIERRE)
  manda sobre el cálculo por fecha. Sin fecha ⇒ carga abierta.
- **Cierre automático**: al vencer, `exigirCargaHabilitada()` bloquea con 409
  `CARGA_CERRADA` el guardado, el envío y los adjuntos **solo para las
  dependencias**; DGPD y ADMIN siguen operando (son quienes prorrogan).
- **Avisos**: a 7 y a 1 día del vencimiento se emite `PLAZO_PROXIMO` a la
  dependencia (evaluación perezosa con throttle horario desde
  `GET /api/v1/notificaciones`), y al entrar a Registro aparece un popup con
  los indicadores por vencer (una vez por sesión).
- **SLA**: cada envío escribe una fila en `SlaCarga` (plazo vigente, días de
  desvío, en plazo, con prórroga). El resumen por dependencia se ve en
  **Gobernanza → SLA de carga** y en la hoja "SLA de carga" del Excel de
  mediciones.

Otros cambios pedidos por el Poder Judicial (2026): el **rechazo se retiró del
circuito** (`ValidarInputSchema` acepta solo APROBADO/OBSERVADO; el estado
subsiste para el histórico); DGPD/Admin pueden **eliminar evidencias** mientras
la medición no esté aprobada; ante los roles de carga el historial muestra
**"la DGPD"** en lugar del nombre del validador; Administración incorpora
**Estructura del PEI** (alta/baja de OE, AE e indicadores) y **Ejecución
presupuestaria** (asignado/ejecutado del ejercicio, publicada en el Reporte
ejecutivo con gráfico).

## Notificaciones (campanita)

Bandeja in-app por usuario (tabla `Notificacion`, en ambas bases de datos):

- **Generación**: cada transición de la máquina de estados emite
  notificaciones (`notificaciones.service.ts`, enganchado en
  `medicion.service.ts`): las cargas **enviadas** notifican a DGPD/Admin; las
  **resoluciones** (aprobada/observada/rechazada/rectificada/en revisión)
  notifican a los usuarios de la dependencia dueña. Al **aprobar**, si el
  indicador queda en semáforo ROJO se emite además `INDICADOR_CRITICO` a
  validadores + dependencia. El emisor nunca se auto-notifica; un fallo de
  notificación jamás rompe la transición (fire-and-forget).
- **Campanita** (`src/ui/layout/campanita.tsx`): badge de no leídas con
  polling de 60 s contra `GET /api/v1/notificaciones`; el click marca leída
  (`POST /api/v1/notificaciones/leer`) y navega al destino.
- **Detalle de carga** (`/registro/carga/[id]`): expediente individual de una
  medición — valores, evidencias descargables, resoluciones de la DGPD y
  timeline completo del historial. DGPD/Admin ven cualquiera; una dependencia
  solo las suyas (scoping de `medicion.repo`).
- **Seed de demo**: `node scripts/seed-notificaciones.mjs` siembra la bandeja
  en la BD de prueba desde el historial real (idempotente).

## Temas visuales (Agentes PEI · Clásico)

La plataforma tiene dos temas conmutables por usuario desde el AppBar (y
anónimamente desde el login):

- **Agentes PEI** (por defecto): identidad del programa — Poppins, gradiente
  azul→magenta, naranja de acción, fondo crema, radios amplios, movimiento
  sutil (framer-motion, respeta `prefers-reduced-motion`).
- **Clásico**: institucional CSJ — navy, Georgia, radios 4 px.

Cómo funciona:

- **Tokens CSS**: `src/app/globals.css` define `:root`/`[data-theme="clasico"]`
  y `[data-theme="agentes"]` como tripletas RGB (`--c-*`), radios (`--r*`),
  sombras, fuentes (`--font-display/--font-body`) y gradientes
  (`--grad-marca/--grad-accion`). `tailwind.config.ts` los expone como
  `bg-azul/40`, `rounded-pj`, `font-serif`, `bg-marca`, etc.
  `src/ui/theme/tokens.ts` exporta `rgb(var(--c-x))` para Recharts y estilos
  inline.
- **Regla: nunca un hex literal en componentes.** Un color nuevo se agrega como
  token en ambos bloques de `globals.css` + entrada en `tailwind.config.ts`.
- **Variantes** `agentes:` y `clasico:` (plugin en `tailwind.config.ts`) para
  diferencias puntuales (p. ej. `agentes:rounded-chip`, hero del
  `PageHeader`). Diferencias estructurales (AppBar, Sidebar, Footer, login)
  viven en `src/ui/layout/agentes/` y se eligen en el layout por `tema`.
- **Resolución** (`src/server/tema/tema.ts`): cookie `pei-tema` → JWT
  (`Usuario.tema`, cargado al login) → `"agentes"`. El `<html data-theme>` se
  decide en el servidor (sin FOUC ni mismatch). Cambiar tema =
  `setTemaAction` (BD de control + cookie 1 año + revalidate).
- **Reportes imprimibles siempre en Clásico**: `(print)/reportes/layout.tsx`
  envuelve en `<div data-theme="clasico">` — los PDFs son documentos
  oficiales CSJ.
- Componentes con contexto cliente: `TemaProvider`/`useTema()`,
  `MotionProvider`, `Aparecer`, `Contador`, `BlobsFondo`, `LogoAgentes`.

## Deploy

Preparado para **Render + TiDB** (no ejecutado): `render.yaml` +
`docs/deploy-render.md`. Portabilidad Fase B (PostgreSQL on-premise del PJ):
cambiar el `provider` de Prisma; el cálculo vive en dominio TS, sin SQL crudo.

## Fuera de alcance de esta fase

Importación ETL de Excel (endpoint + plantilla), e2e Playwright completo,
LDAP institucional. El diseño ya los contempla (ver prompt maestro §12/§14).
