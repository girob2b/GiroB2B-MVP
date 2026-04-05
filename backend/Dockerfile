# ─── GiroB2B — Fastify Backend (Independent) ────────────────────────────────

# ── 1. Dependências ─────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
# Se houver package-lock.json, descomente a linha abaixo
# COPY package-lock.json ./
RUN npm install

# ── 2. Desenvolvimento ───────────────────────────────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]
