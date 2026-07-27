# Despliegue en Render + TiDB Serverless (Fase A)

Guía paso a paso para poner la plataforma en producción. El deploy **no está
ejecutado**: requiere tus credenciales de Render.

## 0. Prerrequisitos

- Cuenta en [Render](https://render.com) con el repo Git conectado
  (GitHub/GitLab; subí este proyecto a un repo privado).
- Clúster TiDB Serverless con las databases `peipj` (producción) y
  `peipj_test` (demo) — ya creadas y sembradas desde este proyecto.

## 1. Preparar las bases (ya hecho desde local, repetir solo si hace falta)

```bash
npm run data:verify        # valida el dataset canónico (6/39/89)
npm run db:setup:all       # push + seed de AMBAS databases (idempotente)
```

- `peipj` queda con estructura + usuarios, **sin mediciones**.
- `peipj_test` queda además con **mediciones mockup** en todos los estados
  del workflow. Re-sembrar test BORRA sus mediciones y las recrea.

## 2. Crear el servicio en Render

Opción A — Blueprint: el repo incluye `render.yaml`; en Render:
**New → Blueprint** y seleccioná el repo.

Opción B — manual: **New → Web Service**, runtime Node:

| Campo | Valor |
|---|---|
| Build command | `npm ci && npx prisma generate && npm run build` |
| Start command | `npm run start` |
| Health check | `/api/health` |

## 3. Variables de entorno (dashboard de Render)

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `mysql://USUARIO:PASSWORD@HOST:4000/peipj?sslaccept=strict&connection_limit=5&pool_timeout=15` |
| `DATABASE_URL_TEST` | igual pero `/peipj_test` |
| `AUTH_SECRET` | `openssl rand -base64 32` (uno NUEVO para producción) |
| `AUTH_URL` | `https://<tu-servicio>.onrender.com` |
| `AUTH_TRUST_HOST` | `true` |
| `DB_DEFAULT_ENV` | `prod` (¡en producción los no-admin ven prod!) |
| `NODE_ENV` | `production` |

## 4. Primer despliegue

1. Deploy desde Render (build ≈ 3-5 min).
2. Verificar `https://<servicio>.onrender.com/api/health` → `{"status":"ok"}`.
3. Login con `admin@pj.gov.py` y **cambiar inmediatamente la contraseña**
   desde Administración → Usuarios (la clave demo `pei2026` es pública en el
   README).

## 5. Seguridad post-deploy (obligatorio)

- **Rotar la contraseña del usuario de TiDB** desde la consola de TiDB Cloud
  (las credenciales iniciales circularon por chat) y actualizar
  `DATABASE_URL`/`DATABASE_URL_TEST` en Render y en los `.env` locales.
- Cambiar las contraseñas de los 7 usuarios demo o desactivar los que no se
  usen (Administración → Usuarios).
- Restringir en TiDB Cloud el acceso por IP si aplica (Render usa IPs
  dinámicas salvo plan con IP fija).

## 6. Actualizaciones de esquema

En esta fase el esquema se sincroniza con `prisma db push` (sin migraciones,
evita el shadow database en TiDB):

```bash
npm run db:push:prod && npm run db:push:test
```

Para la Fase B (PostgreSQL on-premise del Poder Judicial):
- cambiar `provider = "postgresql"` en `prisma/schema.prisma`,
- generar el baseline con `prisma migrate dev` contra Postgres,
- empaquetar con Docker (Next.js standalone) detrás de Apache,
- sustituir Credentials por LDAP institucional en `src/server/auth/auth.ts`.
El dominio (cálculo de cumplimiento) no cambia: es TypeScript puro sin SQL.

## 7. Operación

- **Cold start**: el plan Starter duerme tras inactividad; el primer request
  tarda ~30 s (Render) + el despertar de TiDB Serverless. El health check
  puede usarse como warm-up externo.
- **Switch prod/test**: solo los ADMIN pueden cambiar su sesión a la base de
  prueba (banner MODO PRUEBA). El resto de los usuarios siempre ve
  `DB_DEFAULT_ENV`.
- **Backups**: TiDB Serverless hace backups automáticos; verificar la
  retención en la consola de TiDB Cloud.
