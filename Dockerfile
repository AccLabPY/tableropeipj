# ============================================================================
#  Plataforma PEI 2026–2030 — imagen de producción (pnud-app, Poder Judicial)
#  Multi-stage: deps → builder → runner (Next.js standalone en :3000).
#  Los secretos NO entran a la imagen: llegan por env_file en docker compose.
# ============================================================================

FROM node:20-bookworm-slim AS deps
WORKDIR /app
# --include=dev: typescript/tailwind/postcss viven en devDependencies y el
# build las necesita aunque NODE_ENV=production (mismo motivo que render.yaml).
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --include=dev

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# El host tiene 4 GB de RAM: acotar el heap del build de Next.
ENV NODE_OPTIONS=--max-old-space-size=3072
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
# Sin el paquete openssl, Prisma no detecta libssl 3 y cae al engine 1.1.x
# (inexistente en bookworm): el login moría con PrismaClientInitializationError.
RUN apt-get update -qq && apt-get install -yqq --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Refuerzo: motor de Prisma por si el tracing de standalone lo omitiera.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
