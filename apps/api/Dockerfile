# ─── GiroB2B — apps/api (Fastify) ────────────────────────────────────────────
# Build context: girob2b/ (monorepo root)

# ── Desenvolvimento com hot-reload ────────────────────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /repo

ENV NODE_ENV=development

# Instala dependências do workspace inteiro de uma vez
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install

WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["npm", "run", "dev"]

# ── Builder de produção ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/
COPY apps/web/package.json apps/web/package.json
RUN npm install

WORKDIR /repo/apps/api
RUN npm run build

# ── Runner de produção ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /repo/apps/api/package.json ./
COPY --from=builder /repo/apps/api/dist ./dist
RUN npm install --omit=dev

EXPOSE 3001
CMD ["node", "dist/server.js"]
