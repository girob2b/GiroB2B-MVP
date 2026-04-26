# GiroB2B — Web Scraping Service

> Microsserviço `girob2b-scraper` responsável por descoberta e enriquecimento de fornecedores externos ao catálogo interno. Alimenta a funcionalidade "Pesquisa na web" do Explorar.
>
> **Status:** Sprint 1 em andamento (skeleton + contratos). Ver [Roadmap](#roadmap).

---

## 1. Objetivo

Permitir que o usuário comprador encontre fornecedores que **ainda não estão cadastrados na plataforma**, usando a web pública como fonte. Esses resultados aparecem na listagem do Explorar com a etiqueta **"Pesquisa web"** e permitem:

1. Visualizar uma "página" sintética da empresa descoberta (modal overlay lateral).
2. Entrar em contato via canais detectados (email, WhatsApp, telefone, formulário do site).
3. Convidar a empresa a reivindicar seu perfil na plataforma.

---

## 2. Decisões arquiteturais (ADRs)

### ADR-001 — Microsserviço separado (não rota Next.js)
Scraping é lento, falível e pode travar threads do Next. Isolar em container próprio evita que falha do scraper derrube o painel, permite reinício independente e habilita escala horizontal futura.

### ADR-002 — Schema dedicado `scraper.*` no Supabase (não DB novo)
Reaproveita infra (RLS, auth, backups). Isola dados descobertos dos dados transacionais — nenhuma tabela do `public.*` é poluída por dados não verificados.

### ADR-003 — Stack 100% gratuita no MVP
- **SearXNG self-hosted** como fonte de SERP (sem API key)
- **undici + cheerio** para scrape de landing pages
- **Gemini 2.0 Flash free tier** (1.500 req/dia) para extração estruturada
- **BrasilAPI** para validação de CNPJ
- Total mensal: R$ 0

Quando escalar, troca-se SearXNG por Google CSE ($5/mil) e Gemini pela versão paga. Arquitetura não muda.

### ADR-004 — SSE (não WebSocket) para streaming
Unidirecional (servidor → cliente), reconexão automática no browser, sem bibliotecas extras. Suficiente pois o cliente só precisa receber resultados, não enviar dados bidirecionalmente.

### ADR-005 — BullMQ + Redis para fila
Retries com backoff exponencial, job coalescing (mesma query dedupa), dead-letter queue, observabilidade via Bull Board. Padrão de mercado.

### ADR-006 — Pipeline em 3 camadas com stream incremental
Usuário não espera tudo — cada camada empurra resultados via SSE assim que prontos.

### ADR-007 — Extração via LLM, não regex
Landing pages variam muito. LLM com JSON schema é mais robusto que cheerio+regex. Fallback heurístico só quando LLM falhar ou estiver fora de quota.

### ADR-008 — Modal lateral (sheet), não fullscreen
Padrão LinkedIn/Notion: sheet 70vw em desktop, fullscreen em mobile. Usuário mantém contexto da busca atrás.

### ADR-009 — Deduplicação por domínio
`hash(normalized_domain)` é a chave. Mesma empresa descoberta por queries diferentes reaproveita dados. Reduz ~80% de scrape redundante.

---

## 3. Topologia

```
┌──────────────────────── Frontend (Next.js) ────────────────────────┐
│                                                                     │
│  Explorar → "Pesquisa na web" (checkbox)                           │
│         │                                                           │
│         ├─► POST /api/search/web  ──► {jobId}                      │
│         │                                                           │
│         └─► GET  /api/search/web/:jobId/stream (SSE)               │
│             └─► cards progressivos (skeleton→partial→complete)     │
│             └─► click → Modal overlay lateral (company sheet)      │
└────────────────────────────┬────────────────────────────────────────┘
                             │ proxy SSE
                             ▼
┌──────────────── Microsserviço girob2b-scraper ──────────────────────┐
│                                                                     │
│  POST /jobs/search          → cria job, dedup, retorna jobId       │
│  GET  /jobs/:id             → status + resultados atuais           │
│  GET  /jobs/:id/stream      → SSE push incremental                 │
│  GET  /companies/:cnpj      → ficha completa da empresa descoberta │
│  POST /companies/:cnpj/contact → registra intenção + dispara email │
│  DELETE /companies/:cnpj    → LGPD (empresa pede remoção)          │
│  GET  /health                                                      │
│                                                                     │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐             │
│  │   BullMQ    │──►│   Worker(s)  │──►│  Pipeline    │             │
│  │  (Redis)    │   │  (N workers) │   │  L1 → L2 → L3│             │
│  └─────────────┘   └──────────────┘   └──────────────┘             │
│         ▲                                     │                    │
│         │                                     ▼                    │
│  Cache Redis                       ┌──────────────────┐            │
│  (query→jobId, 24h)                │ Supabase scraper │            │
│                                    │ .discovered_*    │            │
│                                    └──────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
        │                    │                      │
        ▼                    ▼                      ▼
  ┌──────────┐         ┌─────────────┐       ┌──────────────┐
  │ SearXNG  │         │ BrasilAPI   │       │ Gemini Flash │
  │ (meta-   │         │ (CNPJ       │       │ (extração    │
  │  search) │         │  oficial)   │       │  estruturada)│
  └──────────┘         └─────────────┘       └──────────────┘
```

---

## 4. Pipeline de 3 camadas

Para cada query do usuário, um job executa 3 camadas e emite eventos SSE ao final de cada uma.

### Camada 1 — Descoberta (0-2s)
**Fonte:** SearXNG → Google/Bing/DDG/Brave agregados.
**Output:** lista de URLs únicas por domínio (top 10-20).
**Evento SSE:** `discovered` com `[{domain, title, snippet, url}]` — frontend já renderiza cards em estado `skeleton`.

### Camada 2 — Scrape + Extração (2-8s por empresa, paralelizado)
**Fonte:** GET da homepage via undici (cheerio para fallback, Playwright só se houver indício de SPA).
**Extração:** Gemini Flash recebe `{html_plaintext, meta_tags, json_ld}` e retorna JSON estruturado:
```json
{
  "legal_name": "string|null",
  "trade_name": "string|null",
  "cnpj": "string|null",
  "address": { "street": "...", "city": "...", "state": "...", "cep": "..." },
  "contact": { "email": "...", "phone": "...", "whatsapp": "..." },
  "products": [{ "name": "...", "description": "...", "category_hint": "..." }],
  "description": "string|null"
}
```
**Fallback:** se Gemini falhar, heurísticas regex extraem CNPJ/email/telefone.
**Evento SSE:** `partial` com dados parciais por empresa — cards saem de `skeleton` e vão para `partial`.

### Camada 3 — Validação oficial (3-10s)
**Fonte:** se CNPJ foi descoberto, consulta [BrasilAPI](https://brasilapi.com.br/docs) para confirmar razão social oficial, CNAE, situação cadastral e endereço registrado.
**Mapeamento:** CNAE → categoria interna (lookup table).
**Evento SSE:** `enriched` com dados oficiais — cards vão para `complete`. Se não teve CNPJ → card fica `partial` (etiqueta "Limitada").

---

## 5. Schema do banco (migration 016)

Tabelas criadas no schema `scraper`:

### `scraper.discovered_companies`
Uma linha por empresa descoberta (chave = domínio normalizado).

| coluna | tipo | descrição |
|---|---|---|
| `id` | uuid pk | identificador interno |
| `domain` | text unique | domínio normalizado (ex: `acme.com.br`) |
| `cnpj` | text unique nullable | CNPJ descoberto e validado |
| `legal_name` | text | razão social (oficial se veio da BrasilAPI) |
| `trade_name` | text | nome fantasia |
| `address` | jsonb | `{street, city, state, cep}` |
| `segment_cnae` | text | CNAE principal |
| `segment_slug` | text | categoria interna mapeada |
| `products` | jsonb | `[{name, description, category_hint}]` |
| `contact` | jsonb | `{email, phone, whatsapp}` |
| `website` | text | URL canônica |
| `logo_url` | text nullable | favicon ou og:image |
| `description` | text nullable | resumo extraído |
| `source_quality` | text check(`high`\|`medium`\|`low`) | qualidade agregada dos dados |
| `claimed_by_supplier_id` | uuid fk → suppliers | se empresa reivindicou |
| `content_hash` | text | hash da home — evita re-scrape |
| `last_scraped_at` | timestamptz | última coleta |
| `created_at` | timestamptz | |

### `scraper.search_cache`
Cache de query → resultado (TTL 24h).

| coluna | tipo | descrição |
|---|---|---|
| `query_hash` | text pk | `sha256(query + filters)` |
| `query_text` | text | query original (auditoria) |
| `company_ids` | uuid[] | array de `discovered_companies.id` |
| `expires_at` | timestamptz | | 
| `created_at` | timestamptz | |

### `scraper.search_jobs`
Estado dos jobs assíncronos (espelho do que está na BullMQ, para auditoria após expiração).

| coluna | tipo | descrição |
|---|---|---|
| `id` | uuid pk | = jobId da BullMQ |
| `user_id` | uuid nullable | usuário que originou |
| `query` | text | |
| `status` | text check(`queued`\|`running`\|`completed`\|`failed`) | |
| `progress` | int | 0-100 |
| `error_message` | text nullable | |
| `started_at` | timestamptz | |
| `completed_at` | timestamptz nullable | |

### `scraper.contact_requests`
Auditoria de intenções de contato.

| coluna | tipo | descrição |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid fk → users | |
| `company_id` | uuid fk → discovered_companies | |
| `channel` | text check(`email`\|`whatsapp`\|`phone`\|`invite`) | |
| `message` | text nullable | |
| `status` | text check(`pending`\|`sent`\|`failed`) | |
| `created_at` | timestamptz | |

### `scraper.raw_pages` (opcional — auditoria de scrape)
HTML bruto por domínio (apenas home). Permite re-extração futura sem re-scrapear.

| coluna | tipo | descrição |
|---|---|---|
| `domain` | text pk | |
| `url` | text | URL canônica acessada |
| `status_code` | int | |
| `html` | text | HTML bruto (comprimido opcional) |
| `fetched_at` | timestamptz | |

**RLS:** todas as tabelas `scraper.*` só são acessíveis via service role. Frontend nunca consulta direto — sempre via microsserviço.

---

## 6. Contratos de API (microsserviço)

### `POST /jobs/search`
Cria job de busca (ou retorna resultado cacheado).

**Body:**
```json
{
  "query": "embalagens plásticas",
  "filters": {
    "state": "SP",
    "segment_slug": "embalagens"
  },
  "user_id": "uuid-opcional"
}
```
**200 (cache hit):**
```json
{
  "cached": true,
  "companies": [{ /* discovered_companies */ }]
}
```
**202 (job enfileirado):**
```json
{
  "cached": false,
  "jobId": "uuid",
  "estimatedSeconds": 15
}
```

### `GET /jobs/:id`
Status atual do job (polling fallback).

**200:**
```json
{
  "status": "running",
  "progress": 45,
  "companies": [/* resultados parciais */]
}
```

### `GET /jobs/:id/stream` (SSE)
Stream incremental de eventos.

**Eventos:**
- `event: discovered` — `{domain, title, snippet, url}[]`
- `event: partial` — `{companyId, partial: {...}}`
- `event: enriched` — `{companyId, full: {...discovered_company}}`
- `event: progress` — `{progress: 0-100}`
- `event: done` — `{totalCompanies, durationMs}`
- `event: error` — `{message, code}`

### `GET /companies/:cnpj`
Ficha completa (para modal overlay). Aceita também `:id` (uuid).

### `POST /companies/:cnpj/contact`
Registra intenção e dispara ação no canal detectado.

**Body:**
```json
{
  "user_id": "uuid",
  "channel": "email",
  "message": "Olá, temos interesse em..."
}
```

### `DELETE /companies/:cnpj`
**LGPD — endpoint público mediado pelo admin.** Empresa pede remoção via formulário → admin aprova → chama este endpoint. Remove dados descobertos e adiciona domínio à blocklist.

### `GET /health`
```json
{ "status": "ok", "redis": "ok", "searxng": "ok", "db": "ok" }
```

---

## 7. Contratos no Next.js (proxy)

### `POST /api/search/web`
Proxy que adiciona `user_id` a partir da sessão Supabase e encaminha para o microsserviço.

### `GET /api/search/web/:jobId/stream`
Proxy SSE transparente. Valida sessão antes de repassar.

### `GET /api/search/web/company/:id`
Proxy para `GET /companies/:id`.

### `POST /api/search/web/company/:id/contact`
Proxy para `POST /companies/:cnpj/contact`, registra `user_id` da sessão.

---

## 8. Estrutura de diretórios

```
apps/scraper/
├── Dockerfile
├── package.json
├── tsconfig.json
├── src/
│   ├── server.ts                 # bootstrap Fastify
│   ├── config.ts                 # env vars tipadas (zod)
│   ├── plugins/
│   │   ├── db.ts                 # cliente Supabase service-role
│   │   ├── redis.ts              # ioredis
│   │   └── queue.ts              # BullMQ queue + worker
│   ├── routes/
│   │   ├── jobs.ts               # POST /jobs/search, GET /jobs/:id, SSE
│   │   ├── companies.ts          # GET/POST/DELETE /companies
│   │   └── health.ts             # GET /health
│   ├── services/
│   │   ├── searxng.ts            # cliente SearXNG
│   │   ├── scrape.ts             # undici + cheerio
│   │   ├── extract.ts            # Gemini Flash
│   │   ├── brasilapi.ts          # cliente BrasilAPI
│   │   ├── dedup.ts              # normalização de domínio + hash
│   │   └── cache.ts              # search_cache + content_hash
│   ├── pipeline/
│   │   ├── layer1-discover.ts
│   │   ├── layer2-scrape.ts
│   │   └── layer3-enrich.ts
│   ├── workers/
│   │   └── search-worker.ts      # BullMQ worker
│   ├── lib/
│   │   ├── sse.ts                # helper SSE
│   │   ├── logger.ts
│   │   └── cnae-map.ts           # CNAE → categoria interna
│   └── types/
│       └── index.ts              # tipos compartilhados
docs/
└── WEB_SCRAPING.md               # este documento
```

---

## 9. Variáveis de ambiente

`apps/scraper/.env`:

```bash
# ── Servidor ────────────────────────────────────────────────────────
PORT=3002
NODE_ENV=development
LOG_LEVEL=info

# ── Redis (BullMQ) ──────────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── Supabase (service role — tem acesso ao schema scraper) ─────────
SUPABASE_URL=https://gwsfovtcsggbdrerynbf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# ── SearXNG (meta-search self-hosted) ───────────────────────────────
SEARXNG_URL=http://searxng:8080

# ── BrasilAPI (sem auth) ────────────────────────────────────────────
BRASILAPI_URL=https://brasilapi.com.br/api

# ── Extração por LLM ────────────────────────────────────────────────
# V1: Gemini Flash free tier (1500 req/dia)
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash

# ── Rate limits ─────────────────────────────────────────────────────
MAX_JOBS_PER_USER_PER_MIN=5
CACHE_TTL_HOURS=24
CONTENT_REFRESH_DAYS=30
SCRAPE_TIMEOUT_MS=15000
```

---

## 10. Segurança, LGPD e guardrails

1. **Só dados empresariais**: CNPJ, razão social, endereço comercial, CNAE, site, emails com domínio da empresa. Nunca CPF, celular pessoal, nome de pessoa física.
2. **robots.txt respeitado**: antes de scrapear, GET `/robots.txt` e checa `Disallow` — se bloqueado, registra e pula.
3. **Allowlist de TLDs**: `.com.br`, `.com`, `.ind.br`, `.net.br`, `.org.br`. Outros TLDs são pulados.
4. **Blocklist de domínios**: lista mantida em `scraper.domain_blocklist` (empresas que pediram remoção, concorrentes diretos, redes sociais). Atualizada via admin.
5. **Rate-limit por usuário**: 5 jobs/min, 30 jobs/dia. Evita DDoS acidental e custo desnecessário.
6. **Circuit breaker por fonte**: SearXNG, BrasilAPI, Gemini cada um com seu breaker — 3 falhas em 1min desativa a fonte por 5min.
7. **Retenção**: dados em `discovered_companies` expiram após 90 dias sem consulta (re-scrape sob demanda).
8. **User-Agent identificável**: `GiroB2B-Scraper/1.0 (+https://girob2b.com.br/crawler)` — transparência.
9. **Delay entre requests no mesmo domínio**: 2s entre hits (polite crawling).
10. **Endpoint DELETE público** (mediado pelo admin): empresa pede remoção em `girob2b.com.br/remover-dados` → registrado → removido.

---

## 11. Observabilidade

- **Logs estruturados** (pino) com `job_id`, `domain`, `layer`, `duration_ms`.
- **Métricas Prometheus** (futuro) em `/metrics`: jobs_total, job_duration, source_failures, cache_hit_rate.
- **Bull Board** em `/admin/queues` (protegido) para ver filas em tempo real.

---

## 12. Testes

- **Unit**: extração (Gemini mock), dedup (normalização de domínio), cache key.
- **Integration**: worker completo com SearXNG e BrasilAPI reais em staging.
- **E2E**: frontend → Next proxy → scraper → card renderizado → modal aberto.
- **Fixtures**: HTML de empresas conhecidas em `apps/scraper/test/fixtures/` para extração determinística.

---

## 13. Roadmap

### Sprint 1 — Fundação (em andamento)
- [x] Documentação (este arquivo)
- [ ] Migration 016 com schema `scraper.*`
- [ ] `apps/scraper/` skeleton (Fastify + healthcheck + contratos stub)
- [ ] `docker-compose.yml` com SearXNG + Redis + scraper

### Sprint 2 — Pipeline
- [ ] Cliente SearXNG
- [ ] Scrape com undici + cheerio
- [ ] Extração via Gemini Flash (JSON schema)
- [ ] Validação BrasilAPI
- [ ] Worker BullMQ conectando as 3 camadas
- [ ] SSE multicast

### Sprint 3 — Frontend
- [ ] Proxy SSE em Next.js (`/api/search/web/*`)
- [ ] Integração no `explorer-search.tsx` (cards progressivos)
- [ ] Modal overlay lateral — ficha da empresa
- [ ] CTAs de contato e convite

### Sprint 4 — Hardening
- [ ] Rate-limit por user
- [ ] Circuit breaker
- [ ] LGPD endpoints + blocklist
- [ ] Observabilidade (logs + Bull Board)

### Sprint 5 — Produção
- [ ] Troca SearXNG por Google CSE (se necessário por escala)
- [ ] Deploy em VPS separada (Hetzner/DigitalOcean)
- [ ] CDN em frente ao scraper (cache de resposta de companies)

---

## 14. Pontos abertos para validação posterior

Documentados aqui para Vitor revisar depois dos primeiros testes:

1. **Qualidade da extração com Gemini Flash** — validar com amostra de 20 empresas reais. Se <70% de acurácia, trocar por Gemini Pro ou Claude Haiku.
2. **Taxa de bloqueio do SearXNG** — se >10% das queries falham, avaliar Google CSE desde o início (100 queries/dia grátis).
3. **Tempo total de job** — meta é <15s do skeleton ao enriched. Se passar disso frequentemente, paralelizar mais no scrape de L2.
4. **Heurística de mapeamento CNAE → segmento interno** — tabela inicial cobre top 20 CNAEs brasileiros. Revisar depois de 100 buscas reais.
5. **Detecção de SPA/JS-required** — heurística inicial: `<body>` vazio + muitos scripts. Pode falhar em alguns casos — monitorar.
6. **Tamanho do cache Redis** — com 10k empresas cacheadas, ocupa ~50MB. Ok para V1.
7. **"Convidar empresa"** — V1 gera link manualmente pro admin enviar. Automatizar com email transacional depois.

---

## 15. Referências técnicas

- SearXNG: https://docs.searxng.org/
- BullMQ: https://docs.bullmq.io/
- BrasilAPI: https://brasilapi.com.br/docs
- Gemini API (free tier): https://ai.google.dev/pricing
- SSE (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- Playwright vs undici: https://undici.nodejs.org/ (10× mais rápido para sites estáticos)
