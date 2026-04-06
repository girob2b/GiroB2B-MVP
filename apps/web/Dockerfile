# ─── GiroB2B — apps/web (Next.js) ────────────────────────────────────────────
# Build context: girob2b/ (monorepo root)

# ── Desenvolvimento com hot-reload ────────────────────────────────────────────
# node:20 (Debian/glibc) — Alpine (musl) não tem glibc e o Turbopack/SWC exige
# os bindings nativos linux-x64-gnu
FROM node:20 AS dev
WORKDIR /repo

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Instala dependências do workspace inteiro de uma vez
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm install

WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]

# ── Builder de produção ───────────────────────────────────────────────────────
FROM node:20 AS builder
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/
COPY apps/api/package.json apps/api/package.json
RUN npm install

WORKDIR /repo/apps/web
RUN npm run build

# ── Runner de produção ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public           ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
