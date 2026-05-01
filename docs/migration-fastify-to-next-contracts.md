# Migração Fastify → Next.js Route Handlers — Contratos & Plano

> **Fase 1 (Golden Master) — gerado em 2026-05-01.**
> Mapeia o estado atual do Fastify (`apps/api`) caller-por-caller no front,
> documenta o contrato observável de cada endpoint, e define a ordem de
> migração da Fase 2.
>
> Decisão arquitetural já tomada: **monolito Next.js puro via Route Handlers**
> + Supabase. Backend persistente do Fastify morre ao final da Fase 3.

---

## 1. Mapa de callers (estado real)

### 1.1 Endpoints Fastify EFETIVAMENTE consumidos (8)

| # | Endpoint Fastify | Caller(s) no front | Tipo |
|---|------------------|--------------------|------|
| 1 | `POST /onboarding/complete` | [`app/actions/onboarding.ts`](apps/web/app/actions/onboarding.ts) (`completeOnboarding`) | Server Action |
| 2 | `PATCH /supplier/me` | [`app/actions/supplier.ts`](apps/web/app/actions/supplier.ts) (`updateProfile`, `updatePublicProfileLayout`) | Server Action (×2) |
| 3 | `PATCH /supplier/settings` | [`app/actions/supplier.ts`](apps/web/app/actions/supplier.ts) (`updateCompanySettings`) | Server Action |
| 4 | `POST /products` | [`app/actions/products.ts`](apps/web/app/actions/products.ts) (`createProduct`, `bulkCreateProducts`) | Server Action |
| 5 | `PATCH /products/:id` | [`app/actions/products.ts`](apps/web/app/actions/products.ts) (`updateProduct`) | Server Action |
| 6 | `DELETE /products/:id` | [`app/actions/products.ts`](apps/web/app/actions/products.ts) (`deleteProduct`) | Server Action |
| 7 | `POST /products/import` | [`app/(dashboard)/painel/produtos/importar/_components/import-catalog-client.tsx`](apps/web/app/(dashboard)/painel/produtos/importar/_components/import-catalog-client.tsx) | Client Component |
| 8 | `POST /inquiries` | [`app/(dashboard)/painel/explorar/_components/explorer-search.tsx`](apps/web/app/(dashboard)/painel/explorar/_components/explorer-search.tsx) | Client Component |

### 1.2 Endpoints Fastify NÃO consumidos — candidatos a delete (6)

Confirmado por `grep -rn` em `apps/web` em 2026-05-01. Nenhum caller no front.

| Endpoint | Por que está morto | Ação na Fase 2 |
|----------|-------------------|----------------|
| `POST /auth/login` | Front usa `supabase.auth.signInWithPassword` direto | Não migrar — deletar com `apps/api` na Fase 3 |
| `POST /auth/register` | Front usa `supabase.auth.signUp` direto | idem |
| `POST /auth/verify-email` | Front usa `supabase.auth.verifyOtp` direto | idem |
| `POST /auth/resend-verification` | Front usa `supabase.auth.resend` direto | idem |
| `POST /auth/password/reset` | Front usa `supabase.auth.resetPasswordForEmail` direto | idem |
| `POST /auth/password/update` | Front usa `supabase.auth.updateUser` direto (rota `/redefinir-senha`) | idem |
| `POST /supplier/upgrade` | Sem caller mapeado — provavelmente legado do fluxo unificado de cadastro. **Verificar antes de descartar** | Confirmar dead code; se for, deletar |
| `POST /suggestions` | Sem caller. Funcionalidade existe via `/api/search/needs` (Route Handler Next já existente) | Deletar |
| `GET /supplier/me` | Sem caller. RSCs leem direto via Supabase | Deletar |
| `GET /products` | Sem caller. RSCs leem direto via Supabase | Deletar |
| `GET /inquiries/mine` | Sem caller. RSCs leem direto via Supabase | Deletar |
| `GET /inquiries/received` | Sem caller. RSCs leem direto via Supabase | Deletar |
| `GET /cnpj/:cnpj` | BrasilAPI desligada no MVP (rota já desabilitada em `server.ts`) | Deletar |
| `GET /health` | Vercel não usa healthcheck custom (auto via `/`) | Deletar (criar Route Handler Next se quiser monitor externo) |

**Insight da Fase 1:** o escopo real da migração é **8 endpoints**, não 14+. A Fase 2 fica menor que o brainstorm previu.

---

## 2. Contratos por endpoint (Golden Master)

Cada bloco define o que o Route Handler Next **DEVE** entregar pra que nenhum caller quebre. Critérios de aceite testáveis: status code, shape do body, side effects observáveis no banco/auth.

### 2.1 `POST /onboarding/complete`

**Caller:** [Server Action `completeOnboarding`](apps/web/app/actions/onboarding.ts) — passa Bearer.

**Auth:** requer JWT válido.

**Request body** (Zod, [`apps/api/src/schemas/onboarding.schema.ts`](apps/api/src/schemas/onboarding.schema.ts)):
```ts
{
  segment: "supplier" | "buyer",
  trade_name?: string,
  company_name?: string,
  cnpj?: string,
  phone?: string,
  city?: string,
  state?: string (length 2),
  segments_json?: string (JSON serializado),
  custom_category?: string,
  purchase_frequency?: string
}
```

**Side effects:**
- Cria/atualiza row em `buyers` (sempre — plataforma é B2B)
- Se `segment === "supplier"`: chama `createSupplierUpgrade` (cria/atualiza supplier; chama `syncDerivedUserRole` que faz 4 queries seriais admin)
- Atualiza `auth.users.user_metadata.onboarding_complete = true`
- Atualiza `user_profiles.role` derivado

**Response sucesso (200):**
```ts
{ success: true }
```

**Erros esperados:**
- 401 `{ error: "Token de autenticação ausente." | "Token inválido ou expirado." }`
- 400 `{ error: "Dados inválidos.", errors: { campo: ["msg"] } }` (Zod safeParse)
- 500 `{ error: "<mensagem>" }` (erro interno do service)

**Comportamento crítico:** após sucesso, o front chama `supabase.auth.refreshSession()` para o cookie refletir o novo `onboarding_complete` — sem isso o middleware redireciona em loop. **Não mudar este contrato.**

---

### 2.2 `PATCH /supplier/me`

**Caller:** [Server Action `updateProfile` e `updatePublicProfileLayout`](apps/web/app/actions/supplier.ts) — passa Bearer.

**Auth:** requer JWT válido.

**Request body** (Zod, [`UpdateProfileSchema`](apps/api/src/schemas/supplier.schema.ts)):
```ts
{
  description?: string (max 5000) | null,
  logo_url?: string (url) | null,
  phone?: string (max 30),
  whatsapp?: string (max 30) | null,
  address?: string (max 500) | null,
  website?: string (url) | null,
  instagram?: string (max 200) | null,
  linkedin?: string (max 200) | null,
  founded_year?: number (>= 1800) | null,
  employee_count?: enum | null,
  operating_hours?: string (max 500) | null,
  categories?: string[] (uuid),
  photos?: string[] (url),
  public_profile_layout?: Array<{ key, enabled? }> | null
}
```

**Side effects:**
- UPDATE em `suppliers` WHERE user_id = auth.uid()
- Recalcula `completeness_pct` (chama `recalcCompleteness`)

**Response sucesso (200):**
```ts
{ success: true } // ou supplier atualizado, conferir no service
```

**Erros:**
- 401, 400/422 (Zod), 404 `{ error: "Fornecedor não encontrado." }`, 500

**Comportamento crítico:** WHERE filtra por `user_id` derivado do JWT — IDOR guard. Não pode aceitar `supplier_id` no body sem validação.

---

### 2.3 `PATCH /supplier/settings`

**Caller:** [Server Action `updateCompanySettings`](apps/web/app/actions/supplier.ts) — passa Bearer.

**Request body** (Zod, [`UpdateSettingsSchema`](apps/api/src/schemas/supplier.schema.ts)):
```ts
{
  phone?: string (max 30),
  whatsapp?: string (max 30) | null,
  address?: string (max 500) | null,
  cep?: string (max 20) | null,
  city?: string (max 100),
  state?: string (length 2),
  inscricao_municipal?: string (max 50) | null,
  inscricao_estadual?: string (max 50) | null,
  situacao_fiscal?: enum | null,
  allow_relisting?: boolean
}
```

**Side effects:** UPDATE em `suppliers` (subset de campos fiscais/contato).

**Response:** `{ success: true }`. Erros idem 2.2.

---

### 2.4 `POST /products`

**Caller:** [`createProduct`, `bulkCreateProducts`](apps/web/app/actions/products.ts).

**Request body** (Zod, [`CreateProductSchema`](apps/api/src/schemas/products.schema.ts)):
```ts
{
  name: string (min 2, max 200),
  description?: string (max 5000) | null,
  category_id?: string (uuid) | null,
  unit?: string (max 50) | null,
  min_order?: number (int positive) | null,
  price_min_cents?: number (int >= 0) | null,
  price_max_cents?: number (int >= 0) | null,
  tags?: string[] (max 20 items, max 60 chars each) | null,
  images?: string[] (url, max 10 items, max 2000 chars each) | null,
  status?: "active" | "paused" | "draft" (default "active"),
  visibility?: "global" | "chat_only" (default "global")
}
```

**Side effects:**
- Resolve `supplier_id` via `getSupplierIdForUser(userId, token)`
- Gera slug único do nome
- INSERT em `products`
- Recalcula completeness do supplier

**Response sucesso (201):**
```ts
{ id: string, slug: string, ... } // produto criado
```

**Erros:** 401, 400/422 Zod, 404 `{ error: "Você precisa ter um perfil de fornecedor para criar produtos." }`, 500.

---

### 2.5 `PATCH /products/:id`

**Caller:** [`updateProduct`](apps/web/app/actions/products.ts).

**Request body:** [`UpdateProductSchema`](apps/api/src/schemas/products.schema.ts) (partial de `CreateProductSchema`).

**Side effects:**
- Resolve `supplier_id` via JWT
- UPDATE em `products` WHERE `id = :id AND supplier_id = <resolvido>` — **IDOR guard crítico**
- Recalcula completeness

**Response sucesso (200):** produto atualizado.

**Erros:** 401, 404 `{ error: "Produto não encontrado." }` (se `:id` não pertence ao supplier — não confundir com 403; o WHERE compound retorna 0 rows e o service traduz pra 404).

---

### 2.6 `DELETE /products/:id`

**Caller:** [`deleteProduct`](apps/web/app/actions/products.ts).

**Side effects:**
- Resolve `supplier_id` via JWT
- UPDATE `products SET status = 'deleted'` (soft delete) WHERE `id AND supplier_id`
- Recalcula completeness

**Response sucesso (204):** sem body.

**Comportamento crítico:** `apiClient` tem `if (res.status === 204) return undefined;`. Manter 204 sem body.

---

### 2.7 `POST /products/import`

**Caller:** [`import-catalog-client.tsx`](apps/web/app/(dashboard)/painel/produtos/importar/_components/import-catalog-client.tsx) — Client Component.

**Request body:**
```ts
{ original_product_id: string (uuid) }
```

**Side effects (sequenciais — atenção ao timeout):**
1. SELECT do produto original (com supplier dono)
2. **Validação:** se `original.supplier_id === supplier_atual_id` → 403 (não pode importar próprio produto)
3. **Dedup:** se já existe produto importado com `imported_from_id = original.id` → 409
4. **Download HTTP da imagem** original (`copyImageToBucket`) — latência indeterminada
5. **Upload da imagem** copiada pra Supabase Storage
6. INSERT do produto importado com `imported_from_id` apontando pro original

**Response sucesso (201):**
```ts
{ id: string, slug: string, ... }
```

**Erros:**
- 401, 400, 403 `{ error: "Você não pode importar seu próprio produto." }`, 404 `{ error: "Produto original não encontrado." }`, 409 `{ error: "Você já importou este produto." }`, 500.

**Comportamento crítico:**
- Em Vercel Functions, timeout default é 10s no Hobby. `vercel.json` já tem `maxDuration: 60` para essa rota. Suficiente pra imagens razoáveis (<5MB).
- Para imagens muito grandes: refatorar pra job assíncrono pós-MVP.

---

### 2.8 `POST /inquiries`

**Caller:** [`explorer-search.tsx`](apps/web/app/(dashboard)/painel/explorar/_components/explorer-search.tsx) (linha ~572) — **único caller client-side**.

**Auth:** Bearer no header. **Importante:** este é o único endpoint do front consumido fora de Server Actions; não pode depender de cookie SSR exclusivamente — `requireAuth()` precisa aceitar Bearer header (Fase 0 já entregou esse helper).

**Request body** ([`CreateInquirySchema`](apps/api/src/schemas/inquiries.schema.ts)):
```ts
{
  supplier_id: string (uuid),
  product_id?: string (uuid) | null,
  description: string (min 20, max 5000),
  quantity_estimate?: string (max 200) | null,
  desired_deadline?: string (max 200) | null,
  company_name?: string (max 200) | null,
  cnpj?: string (max 18) | null,
  lgpd_consent: literal(true) // OBRIGATÓRIO — Art. 8 LGPD
}
```

**Side effects (transação atômica via `create_directed_inquiry_tx`):**
1. `pg_advisory_xact_lock` por hash(buyer_id) — serializa concorrência por mesmo buyer
2. **Rate limit:** se >= 10 inquiries criadas no dia atual UTC → 429
3. **Dedup 48h:** key = SHA-256 de `buyer_id:supplier_id:product_id`. Se existe inquiry recente com mesma key → retorna existente, status 200 (NÃO 201)
4. INSERT em `inquiries` (atomic)
5. INSERT em `email_notifications` com `status='sent'` (⚠ FAKE — Resend não chamado, ver AVISOS)
6. INSERT silencioso em `notifications` (try/catch)

**Response sucesso (201 nova / 200 dedup):**
```ts
{
  success: true,
  deduplicated: boolean,
  supplier_name: string,
  inquiry: {
    id: string,
    status: "new",
    buyer_name: string,
    // ... demais campos
  }
}
```

**Erros:**
- 401, 422 `{ error: "Complete os dados básicos da conta antes de enviar uma cotação." }` (perfil buyer incompleto), 429 `{ error: "Limite diário de cotações atingido. Tente novamente amanhã." }`, 500.

**Comportamento crítico (TUDO precisa ser preservado):**
1. **Status code bifurcado** (201 nova vs 200 dedup) — front usa pra saber se foi nova
2. **Mascaramento PII em GET /inquiries/received** (não usado, mas logica vai migrar) — buyer_name/email/phone null se supplier free + contact_unlocked false
3. **Advisory lock** — não trocar por mutex JS (perde garantia de atomicidade no banco)
4. **Dedup key** — exatamente `SHA-256(buyer_id + ":" + supplier_id + ":" + (product_id ?? "no-product"))`
5. **Day-boundary** — `getSaoPauloDayStart()` usa `Intl.DateTimeFormat` com `timeZone: "America/Sao_Paulo"` (importante em servidor com timezone UTC)

---

## 3. Estratégia da Fase 2

### 3.1 Decisão arquitetural — Service direto vs Route Handler

**Server Actions e Server Components do Next rodam no mesmo processo Node** que os Route Handlers. Forçar um hop HTTP interno (`fetch("/api/supplier/settings")`) é desperdício: latência, parse JSON, perda de tipos.

**Padrão da migração:**
- **Caller é Server Action ou Server Component** → extrai a lógica do service do Fastify pra `apps/web/lib/services/<name>.ts` e o caller importa direto. **Nenhum Route Handler novo é criado.**
- **Caller é Client Component** → cria Route Handler em `apps/web/app/api/<path>/route.ts` que envolve o mesmo service. Bearer token continua sendo aceito (helper `requireAuth()` cobre cookie + Bearer).

Resultado prático: dos 8 endpoints reais, **apenas 2 viram Route Handler** (os consumidos por Client Component). Os outros 6 viram funções TS chamadas direto.

### 3.2 Ordem de migração

Crescente em complexidade. Cada item = 1 PR isolado, validado com **smoke test manual** + type-check + lint.

| Ordem | Endpoint | Caller | Tipo da migração | Estimativa |
|-------|----------|--------|------------------|-----------|
| 1 | `PATCH /supplier/settings` | Server Action | Service direto | 2-3h |
| 2 | `PATCH /supplier/me` | Server Action ×2 | Service direto | 3-4h |
| 3 | `POST /products` | Server Action ×2 | Service direto | 3-4h |
| 4 | `PATCH /products/:id` | Server Action | Service direto | 2-3h |
| 5 | `DELETE /products/:id` | Server Action | Service direto | 1-2h |
| 6 | `POST /onboarding/complete` | Server Action | Service direto (com admin client + syncDerivedUserRole) | 4-6h |
| 7 | `POST /products/import` | Client Component | **Route Handler** (`POST /api/products/import`) | 4-6h |
| 8 | `POST /inquiries` | Client Component | **Route Handler** (`POST /api/inquiries`) — advisory lock + dedup + rate limit | 6-8h |

**Total estimado:** ~25-35h, ~3-5 dias de foco solo.

### 3.3 Validação por PR — smoke test manual

Estratégia decidida: **smoke test manual como validação primária**. Sem fixtures persistentes, sem suíte de regressão automatizada nessa fase. Justificativa: projeto local sem usuários reais; banco vazio; investir em fixtures que serão deletadas com o Fastify é trabalho jogado fora.

**Checklist de smoke test por endpoint migrado:**
1. **Type-check passa:** `pnpm --filter @girob2b/web exec tsc --noEmit`.
2. **Build passa:** `pnpm --filter @girob2b/web build`.
3. **Endpoint Fastify ainda responde** (mantém vivo até a Fase 3): `curl http://localhost:3001/<path>`.
4. **Caller no front exercita o caminho novo** — smoke manual no browser:
   - Abre o fluxo (ex.: edita perfil → salva).
   - Confirma comportamento idêntico ao Fastify (sucesso, erro, redirect).
   - Olha network tab pra ter certeza que **não bate mais** em `localhost:3001/<path>` (se for endpoint de Server Action, não há request HTTP visível; se for Route Handler, bate em `/api/<path>` same-origin).
   - Confere no Supabase Studio que side effect (linha gravada/atualizada) aconteceu.

**Fixtures como ferramenta dev opcional:** durante o PR, se quiser comparar bit-a-bit, capture o response do Fastify em fixture temporária (`scripts/capture-fastify-contract.sh`), bata no Route Handler novo com mesmo payload, compare diff, **delete a fixture ao fim do PR**. Não commitar fixtures com PII real (banco local vazio cobre).

### 3.4 Padrão de implementação

**Para cada endpoint Server-Action-only (#1-6):**

1. **Schema:** copia o Zod schema do Fastify pra `apps/web/lib/schemas/<name>.ts`. Evita acoplar Next a `apps/api`. Quando Fase 3 deletar apps/api, este vira a única fonte.
2. **Service:** copia a função do `apps/api/src/services/<name>.service.ts` pra `apps/web/lib/services/<name>.ts`. Recebe um `SupabaseClient` já autenticado por parâmetro (em vez de `token: string`). Marca o arquivo com `import "server-only"` para impedir bundle no client.
3. **Caller:** atualiza a Server Action — remove import do `apiClient`, importa o schema + service novos, chama o service direto com o `supabase` do `createClient()` do server.
4. **Endpoint Fastify:** **deixa vivo** até Fase 3. Não bater nele do front é suficiente; deletar prematuro complica rollback.

**Para cada endpoint Client-Component (#7-8):**

1. **Schema + service** (idênticos a acima).
2. **Route Handler:** `apps/web/app/api/<path>/route.ts` usa `requireAuth(request)` para cookie+Bearer; valida body com Zod; chama o service; retorna `NextResponse.json()`.
3. **Caller no Client Component:** **trocar `apiClient(token).post("/products/import", ...)`** por `fetch("/api/products/import", { method: "POST", headers: { Authorization: \`Bearer ${token}\` } })` ou Server Action wrapper. **Mantém Bearer** porque o componente Client tem `session.access_token` e não pode confiar só em cookie cross-origin.

**Ao terminar todos os 8:**
- `lib/api-client/` inteiro vira dead code (apagar com Fastify).
- `BACKEND_URL` env var deixa de ser referenciada.

---

## 4. Cleanup pós-Fase 2 (Fase 3)

Após os 8 endpoints migrados e em produção por ~1 semana sem regressão:

1. **Apagar `apps/api/`** inteiro (Fastify + services + schemas)
2. **Remover do `package.json` raiz:** `dev:api`, jobs `concurrently` que sobem o Fastify
3. **Remover de `pnpm-workspace.yaml`:** o item `apps/*` continua mas a pasta some
4. **Remover do `.github/workflows/ci.yml`:** job `api:`
5. **Remover** `docker-compose.backend.yml` e `apps/api/Dockerfile`
6. **Atualizar `ARCHITECTURE.md`:** §2.2 removida, §3.1 fluxo refeito sem hop pelo Fastify
7. **Atualizar `MVP_SCOPE.md §8`:** "Backend exclusivo via Supabase + Route Handlers" sai como **Realidade** alinhada à decisão original

---

## 5. Como capturar contratos do Fastify ao vivo (Golden Master)

Quando quiser atualizar este doc com response shapes reais (ao migrar cada endpoint), rode:

```bash
# Subir Fastify localmente
pnpm run dev:api

# Capturar OpenAPI declarado
curl -s http://localhost:3001/docs/json > docs/fastify-openapi.json

# Capturar fixtures (script auxiliar)
bash scripts/capture-fastify-contract.sh
```

O script `scripts/capture-fastify-contract.sh` bate em endpoints públicos com payloads conhecidos e salva fixtures em `apps/web/tests/fixtures/api/<endpoint>.<scenario>.json`. Para endpoints autenticados, exporta `TEST_BEARER_TOKEN=<jwt>` antes (subir Supabase local + fazer login programático).

---

## 6. Observações da Fase 1

- **`lib/api-client/{products,supplier,onboarding}.ts`** são wrappers **sem callers** (Server Actions instanciam `apiClient()` direto). Apagar junto com `apps/api/` na Fase 3.
- **`/auth/*` do Fastify é dead code completo.** O front nunca usou. Sinaliza que a decisão original do MVP_SCOPE §8 ("monolito Next sem backend separado") foi parcialmente respeitada em auth.
- **`POST /supplier/upgrade`** — investigar antes de descartar. Pode estar sendo chamado por algum form de cadastro do supplier que não foi capturado pelo grep.
- **A migração da Fase 2 elimina ~50% do código do Fastify** sem precisar reescrever nada (basta deletar dead endpoints).
