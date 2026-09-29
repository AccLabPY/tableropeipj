# Despliegue on-premise en el Poder Judicial

Runbook de operación de la Plataforma PEI 2026–2030 en la infraestructura de la CSJ.
Audiencia: quien opere los servidores (DGTIC / responsable técnico del proyecto).

## Arquitectura

```
Usuario (LAN/VPN) ──HTTPS──▶ Proxy institucional CSJ (192.168.6.202, pei.csj.gov.py, TLS)
                                  │ HTTP
                                  ▼
                       pnud-app 172.30.150.20 · Apache :80 (vhost pei.conf)
                                  │ ProxyPass → 127.0.0.1:3000
                                  ▼
                       Contenedor Docker `peipj` (Next.js standalone :3000)
                                  │ TCP 5432 (LAN)
                                  ▼
                       pnud-db 172.30.150.21 · PostgreSQL 17 (bases peipj y peipj_test)
```

- TLS termina en el proxy institucional; Apache agrega `X-Forwarded-Proto: https`
  (el proxy CSJ no lo envía) y Auth.js confía en él (`AUTH_TRUST_HOST=true`,
  `AUTH_URL=https://pei.csj.gov.py`).
- El puerto 3000 solo se publica en loopback; el único ingreso es Apache.
- El proxy CSJ no reenvía la IP real del cliente (X-Forwarded-For llega como
  192.168.6.200): no hay IP de usuario final en los logs.

## Layout en pnud-app

| Ruta | Contenido |
|---|---|
| `/opt/peipj/app` | Clon del repositorio (rama desplegada) |
| `/opt/peipj/.env` | Secretos de runtime (chmod 600, **jamás** en el repo) |
| `/etc/apache2/sites-available/pei.conf` | VirtualHost proxy → 127.0.0.1:3000 |

`/opt/peipj/.env` define: `DATABASE_URL` y `DATABASE_URL_TEST` (rol `peipj_app`),
`AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`, `DB_DEFAULT_ENV=prod`. docker compose
sí interpreta comillas en env_file; `docker run --env-file` NO (las deja literales).

## Operaciones frecuentes

Todo como usuario `pnud` en pnud-app:

```bash
cd /opt/peipj/app
docker compose up -d --build     # redeploy (build multi-stage, ~4 GB RAM alcanzan)
docker logs peipj --since 1h     # logs de la app
docker restart peipj             # reinicio (limpia cachés en memoria)
curl -s http://127.0.0.1:3000/api/health   # salud directa, sin proxy
```

Para actualizar código sin acceso del servidor a GitHub: crear un bundle local
(`git bundle create peipj.bundle <rama>`), copiarlo por `scp` y en el servidor
`git fetch /tmp/peipj.bundle <rama> && git merge --ff-only FETCH_HEAD`.

Gotcha ya sufrido: la imagen final necesita el paquete `openssl` (ya está en el
Dockerfile). Sin él, Prisma no detecta libssl 3 y toda consulta muere con
`PrismaClientInitializationError` (el login devuelve `error=Configuration`).

## Base de datos (pnud-db)

- Roles: `peipj_owner` (NOLOGIN, dueño), `peipj_migrator` (DDL: `prisma migrate deploy`),
  `peipj_app` (runtime, solo DML por default privileges). `postgres` solo por socket local.
- `pg_hba` autoriza únicamente la LAN `172.30.150.0/24` (APP y el propio DB) con
  scram-sha-256. La VPN **no** tiene entrada (verificado). Defensa en profundidad
  pendiente de DGTIC: cerrar VPN→5432 en FortiGate.
- Cambios de schema: **nunca** `prisma db push`; siempre migraciones versionadas y
  `prisma migrate deploy` como `peipj_migrator` (scripts `db:migrate:prod|test`),
  ejecutado desde APP en un contenedor `node:20-bookworm-slim` (instalar `openssl`
  antes: `apt-get update && apt-get install -y openssl`).

## Respaldos

- Cron `/etc/cron.d/peipj-backup`: todos los días 02:30, `/usr/local/bin/peipj-backup.sh`
  hace `pg_dump -Fc` de `peipj` y `peipj_test` a `/var/backups/postgresql/`,
  rotación 14 días.
- Restore de prueba (verificado el 2026-09-29 con datos reales):

```bash
sudo -u postgres createdb -T template0 -E UTF8 peipj_restore_check
sudo -u postgres pg_restore -O -x -d peipj_restore_check /var/backups/postgresql/peipj-<fecha>.dump
# comparar conteos contra la base viva; al terminar:
sudo -u postgres dropdb peipj_restore_check
```

## Migración de datos TiDB → PostgreSQL

`scripts/migrar-a-postgres.mjs` (drivers crudos mysql2+pg, snapshot consistente,
TRUNCATE + carga en orden topológico, setval de secuencias, validación con conteos,
sumas de decimales y SHA-256 muestral de evidencias). Corre desde APP:

```bash
docker run --rm -v /opt/peipj/app:/app -w /app \
  --env-file /opt/peipj/.env.migracion node:20-bookworm-slim \
  node scripts/migrar-a-postgres.mjs --db test|prod --paso preflight|carga|secuencias|validar|all
```

`/opt/peipj/.env.migracion` (chmod 600) contiene las URLs TiDB (origen) y las PG
del rol `peipj_migrator` (destino), **sin comillas**. Se elimina tras el cutover.

## Cutover (día D)

1. Congelar escrituras en Render: Admin → Plazos (cierre general) + aviso a usuarios.
2. Re-correr la migración: `--db prod --paso all` y `--db test --paso all` → validación en verde.
3. Merge de `infra/postgresql-pj` a `master`; sincronizar bundle a APP; `docker compose up -d --build`.
4. Verificación funcional en `https://pei.csj.gov.py` (login, carga+evidencia, Excel, PDF).
5. Inmediatamente después: cambiar la contraseña `pei2026` de los usuarios demo
   (el TRUNCATE de la migración restauró los hashes viejos de TiDB).
6. `rm /opt/peipj/.env.migracion` en APP.
7. Render: suspender (no borrar). TiDB queda intacto y de solo lectura ≥2 semanas.

**Rollback**: reactivar el servicio en Render con las variables TiDB originales y
avisar a los usuarios que vuelvan a la URL de Render. No requiere tocar nada on-premise.

**Decomiso definitivo** (tras ≥2 semanas estables): rotar/eliminar credenciales
TiDB Cloud y borrar el servicio de Render.

## Pendientes conocidos

- DGTIC/Networking: cerrar VPN→172.30.150.21:5432 en FortiGate (gate de go-live).
- Re-probar subida de evidencia de 25 MB desde la LAN institucional (por VPN el
  ancho de banda de subida provoca 504 antes del límite real; el WAF Fortinet
  bloquea binarios crudos pero los multipart tipo documento pasan bien).
- Avisar a DGTIC de los aliases `debian11` residuales en `/etc/hosts` de pnud-db.
