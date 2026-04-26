# ─── GiroB2B — apps/scraper (Fastify + BullMQ) ───────────────────────────────
# Build context: girob2b/ (monorepo root)

# ── Desenvolvimento com hot-reload ────────────────────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /repo

ENV NODE_ENV=development

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/scraper/package.json apps/scraper/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install

WORKDIR /repo/apps/scraper
EXPOSE 3002
CMD ["npm", "run", "dev"]

# ── Builder de produção ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/ packages/
COPY apps/scraper/ apps/scraper/
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install

WORKDIR /repo/apps/scraper
RUN npm run build

# ── Runner de produção ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /repo/apps/scraper/package.json ./
COPY --from=builder /repo/apps/scraper/dist        ./dist
COPY --from=builder /repo/node_modules             ./node_modules
COPY --from=builder /repo/packages/shared          ../packages/shared

EXPOSE 3002
CMD ["node", "dist/server.js"]
