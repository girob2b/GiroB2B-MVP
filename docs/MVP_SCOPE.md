# MVP_SCOPE — GiroB2B

> **Documento operacional.** Define o que entra no primeiro lançamento e o que fica pra fase 2.
> Criado em 14/04/2026. Reconciliado com a realidade do código em 01/05/2026 (squad-fullstack de validação — ver `work/2026-05-01/validacao-plataforma/brainstorm.md`).
> Os 27 documentos técnicos permanecem como visão de 12-24 meses; este recorte é o *escopo de execução imediato*.
>
> **Referências primárias:** `1.4_REQUISITOS_FUNCIONAIS.md`, `1.7_DEFINICAO_MVP_SCOPE_LOCK.md`, `4.5_ROADMAP_DE_DESENVOLVIMENTO.md`, `../ARCHITECTURE.md`.

---

## 1. Princípio

O MVP valida **uma única hipótese de negócio**: fornecedores B2B pagam para receber leads qualificados de compradores.

Tudo que não contribui pra testar essa hipótese foi empurrado pra frente. Isso inclui features tecnicamente bonitas (ranking composto, dados ocultos preparatórios, analytics rico) que não afetam a decisão do fornecedor de pagar ou não.

**Regra de decisão:** "Se eu remover isso e o fornecedor ainda conseguir receber um lead e o comprador ainda conseguir enviar uma cotação, fica pra depois."

## 2. Estrutura em Tiers

- **Tier 1 (must-have):** sem isso o marketplace não funciona. Lançamento bloqueado se faltar.
- **Tier 2 (should-have):** aumenta credibilidade e conversão no lançamento. Funciona sem, mas com tração menor.
- **Tier 3 (nice / stretch):** ambicioso. Entra se a velocidade do time permitir. Candidatos naturais ao vibe coding do Gustavo (código repetitivo, parsing, conteúdo).
- **Fora do MVP:** explicitamente adiado. Qualquer pedido de adicionar aqui requer rejustificativa.

---

## 3. Tier 1 — Must-have (~20 features)

Escopo mínimo para lançar. Sem todos abaixo, não há produto.

### 3.1 Autenticação e cadastro

| # | Feature | Notas |
|---|---------|-------|
| 1 | Cadastro unificado (email, senha, nome, telefone, cidade, estado) | Supabase Auth. Nenhum campo de role ainda. |
| 2 | Login email + senha | Padrão Supabase. |
| 3 | Recuperação de senha via e-mail | Template simples. |
| 4 | Confirmação de e-mail obrigatória | Contas não confirmadas em 7d deletadas via job semanal. |
| 5 | Ativação buyer com checkbox LGPD | Trigger: ao enviar primeira inquiry. Role derivada. |
| 6 | Upgrade supplier com CNPJ (via BrasilAPI) | Valida ativo/inativo/duplicado. Fallback: cadastro provisório se API cair. |

### 3.2 Perfil do fornecedor e catálogo

| # | Feature | Notas |
|---|---------|-------|
| 7 | Editar perfil supplier (descrição, telefone, site, endereço, fundação, funcionários-faixa) | Campos estruturados. Sem múltiplas redes sociais ainda. |
| 8 | Upload de 1 logo (Supabase Storage) | Máx 2MB, PNG/JPG/WebP. |
| 9 | CRUD de produtos (nome, descrição, categoria, 1 foto, unidade, faixa de preço) | Sem múltiplas fotos por produto no Tier 1. |
| 10 | Categorização hierárquica (navegar: Categoria → Subcategoria) | Árvore gerenciada por admin. Categorias fixas no seed inicial. |

### 3.3 Busca e descoberta

| # | Feature | Notas |
|---|---------|-------|
| 11 | Busca textual em produtos | PostgreSQL Full-Text Search (tsvector). Não usar Elasticsearch. |
| 12 | Filtros básicos (categoria, cidade, estado) | Sem filtro de preço no Tier 1. |
| 13 | Navegação por categorias (browse) | Páginas listando produtos/fornecedores por categoria. |
| 14 | Página pública do produto (SSR + meta tags) | URL: `/produto/[slug]`. Sem localidade na URL ainda. |
| 15 | Página pública do fornecedor (SSR + meta tags) | URL: `/fornecedor/[slug]`. |

### 3.4 Fluxo de cotação

| # | Feature | Notas |
|---|---------|-------|
| 16 | Inquiry direcionada (comprador → fornecedor específico) | Formulário: descrição, quantidade, prazo, cidade/estado. |
| 17 | Notificação e-mail da inquiry pro supplier (Resend) | Template simples com dados básicos. |
| 18 | Painel supplier: listar inquiries com status (nova/visualizada/respondida/arquivada) | Sem filtros complexos; ordenação por data. |
| 19 | Painel buyer: ver inquiries enviadas com status (enviada/visualizada) | Simplicidade. |

### 3.5 Proteção e operação

| # | Feature | Notas |
|---|---------|-------|
| 20 | Rate limit 10 inquiries/dia por buyer | Supabase-side. |
| 21 | Deduplicação inquiry 48h (mesmo buyer + supplier + produto) | Agrupa numa entrada só. |
| 22 | Admin dashboard mínimo (contagens: suppliers, buyers, produtos, inquiries) | 1 página agregada. |
| 23 | Admin: suspender/reativar supplier | Moderação manual. Sem sistema de denúncias ainda. |

**Estimativa grosseira Tier 1:** 80-100 story points de dev. Com velocity combinada do time (Vitor ~25h/semana + vibe coding do Gustavo em tarefas de casca) estimada em ~20-30 SP/semana, ~4-6 semanas de dev real + 1-2 semanas de QA + 1-2 semanas de setup inicial = **6-10 semanas totais**. Primeiras 2 sprints validam o número real.

---

## 4. Tier 2 — Should-have (~10 features)

Entra se sobrar tempo após Tier 1. Aumenta conversão e credibilidade.

| # | Feature | Notas |
|---|---------|-------|
| T2-1 | Selo "Empresa Verificada" (buyer com CNPJ validado) | Já valida via BrasilAPI no cadastro; só mostrar selo no supplier. |
| T2-2 | Barra de completude de perfil (supplier) | 5-9 campos, percentual. Sem boost de ranking ainda. |
| T2-3 | Upload múltiplas fotos empresa (até 5) | Extensão da feature de logo. |
| T2-4 | Dados estruturados Schema.org (Product + Organization JSON-LD) | Rich snippets no Google. |
| T2-5 | Sitemap XML automático + submissão GSC | Indexação acelerada. |
| T2-6 | Páginas SEO de categoria (`/categoria/[slug]`) | Listagem SSR/ISR. |
| T2-7 | Páginas SEO de localidade (`/fornecedores/[cidade]`) | Hyper-local. |
| T2-8 | Lembrete e-mail perfil incompleto (1 único, aos 7 dias) | Não os 4 lembretes originais — só 1. |
| T2-9 | Admin: gerenciar categorias (CRUD) | Ao invés de fixas no seed. |
| ~~T2-10~~ ✅ | ~~Login social Google~~ | **Implementado** em `apps/web/app/(auth)/login/login-form.tsx` (`signInWithOAuth provider:"google"`). |
| T2-10b | Login com Certificado Digital A1 | **Implementado** (não estava no scope original, foi adicionado). |
| T2-11 | **Lista de necessidades** (buyer sinaliza demanda não atendida pela base interna) | Form com descrição livre + query. Admin cadastra manualmente depois (alimenta base via Tier 3 scraping). Aviso de prazo 1-2 dias ao usuário. |
| T2-12 | **Gate de acesso à "Pesquisa na web"** (feature premium, bloqueada por padrão) | Default: toggle oculto; só aparece para owners/assinantes. Allowlist por email + flag `profiles.can_use_web_search`. Alimenta roadmap de monetização. |

**Estimativa Tier 2:** 35-50 SP. ~2-3 semanas adicionais.

---

## 5. Tier 3 — Stretch (candidatos a vibe coding)

Ambicioso. Entra **só se o Tier 1 sair no prazo e o time tiver gás**. Essas features são o tipo ideal pra vibe coding do Gustavo (código repetitivo, parsing, conteúdo) porque não dependem de decisões arquiteturais críticas do Vitor.

| # | Feature | Zona |
|---|---------|------|
| T3-1 | Scraping de fornecedores (Juntas Comerciais, CNPJ.ws, Google Maps) | Vibe coding (Gustavo) |
| T3-2 | Enriquecimento via IA (Claude/Gemini API — não Bedrock) | Vibe coding (Gustavo) |
| T3-3 | Blog em `/blog` com 4-8 posts seed | Vibe coding (Gustavo) |
| T3-4 | Tags automáticas via NLP simples | Vibe coding (Gustavo) |
| T3-5 | Autocomplete de busca | Misto |
| T3-6 | Páginas SEO programáticas (categoria × localidade) | Vibe coding (Gustavo) — só se volume de fornecedores justificar |
| T3-7 | Importação em massa CSV | Vibe coding (Gustavo) |
| T3-8 | Denúncia de supplier (buyer reporta) | Vitor |
| T3-9 | Admin: moderar produtos (aprovar/rejeitar) | Vitor |
| T3-10 | Admin: tratar denúncias | Vitor |

**Estimativa Tier 3:** 40-80 SP. Altíssima variância dependendo de quanto o Gustavo consegue paralelizar.

---

## 6. Fora do MVP — Fase 2+ (explícito)

Não mexer. Qualquer pedido de adicionar aqui requer justificativa de negócio clara.

- **Monetização e créditos:** sistema de planos, Stripe/Mercado Pago, dados ocultos com "assine pra ver", ranking boost por plano, **busca paga na web por consumo de tokens** (liberada apenas com assinatura ativa — hoje a feature existe mas está gated a owners; a cobrança automatizada entra com billing)
- **UX avançada:** comparação lado-a-lado de 3 fornecedores, favoritos, alertas de novos fornecedores, notificações push/PWA, app mobile
- **Inquiry genérica multi-fornecedor** (com algoritmo de distribuição ponderado)
- **Ranking composto com 5 variáveis** (35% relevância + 25% plano + 15% completude + 15% geo + 10% recência) — no MVP usar ordenação simples (recência + geo)
- **Selo "GiroB2B Verificado" premium** (endereço + identidade + plano Pro+)
- **Reivindicação de perfil pré-cadastrado** (assume base pré-populada por scraping)
- **Analytics dashboard rico** (gráficos de visualizações, conversão por período)
- **CRM de leads desbloqueados** pro supplier
- **Integrações ERP** (Bling, Omie, Conta Azul)
- **WhatsApp Business API** (canal secundário de inquiry)
- **Rating bidirecional** (buyer avalia supplier e vice-versa)
- **Programa de indicação estruturado** (M10-12 do roadmap original)
- **Histórico rico do comprador** (exportar, filtrar, tags)

---

## 7. Divisão de execução: Vitor vs Gustavo (vibe coding)

Baseado em `memory/project_vibe_coding_strategy.md`.

**Vitor (zona de alto risco técnico):**
- Setup de Next.js, Supabase (Auth + Storage + DB), Vercel
- Configuração de Row Level Security no Postgres
- Autenticação completa e fluxo de confirmação
- Validação server-side de CNPJ (BrasilAPI)
- Todas as rotas que gravam/mutam dados críticos (inquiry, cadastro supplier)
- Rate limiting e deduplicação
- Code review do que o Gustavo produz

**Gustavo (zona de casca, via Claude Code + Gemini):**
- Componentes UI com shadcn/ui + Tailwind
- Formulários client-side (cadastro, edição de perfil, produto, inquiry)
- Páginas estáticas (landing, termos, privacidade, FAQ)
- Páginas públicas SSR de produto e fornecedor (template + dados do Supabase)
- Painel do supplier (listagem de inquiries, UI)
- Painel do buyer
- Admin dashboard (leitura de métricas agregadas)
- Upload de imagens (client-side + upload direto ao Supabase Storage)
- Integração com Resend pra e-mail transacional (templates + chamada)
- SEO: meta tags, sitemap, Schema.org
- **Tier 3 completo se acontecer:** scraping, enriquecimento IA, blog, tags automáticas

---

## 8. Stack travada (resolvido 16/04/2026 — reconciliado em 01/05/2026)

Todas as 10 perguntas originais foram respondidas pelo Vitor em 16/04/2026. Fonte canônica das decisões: `admin/decisoes/RESPOSTAS_VITOR_10_PERGUNTAS.md`. A coluna **Realidade (01/05/2026)** registra como cada decisão foi efetivamente executada, com base no squad-fullstack de validação.

| Item | Decisão original (16/04) | Realidade (01/05/2026) |
|------|--------------------------|-------------------------|
| Arquitetura | Monolito modular Next.js + Supabase | **Confirmado.** Monorepo pnpm workspaces (`apps/web`, `apps/girob2b-landing-page`, `apps/scraper`, `packages/shared`) com produto principal concentrado no Next.js. |
| Backend | Route Handlers (`app/api/*`), sem backend separado | **Confirmado após migração 01/05/2026.** O Fastify em `apps/api` foi removido. Mutations server-side usam Server Actions → services locais → Supabase; fluxos client-side usam Route Handlers em `apps/web/app/api/*`. |
| ORM | Prisma | **Não executado.** Em uso: `@supabase/supabase-js` direto + driver `pg` para RPC raw. Prisma nunca foi instalado. |
| Auth | Supabase Auth | **Confirmado.** E-mail/senha + Google OAuth implementados. Cert Digital A1: UI presente, backend ainda é TODO. |
| Storage | Supabase Storage | **Confirmado.** |
| Observabilidade | Sentry | **Parcial.** `instrumentation.ts` e `instrumentation-client.ts` presentes mas operam como no-op se `SENTRY_DSN` não estiver definido. **Sem evidência de DSN configurado em Vercel prod.** Sem release tagging nem sourcemaps. Bloqueante pré-go-live. |
| E-mail transacional | Resend (T1-17 declarado must-have) | **Não implementado de fato.** `enqueueInquiryNotification` insere row em `email_notifications` com `status='sent'` sem chamar a SDK Resend. Bloqueante pré-go-live — sem isso o MVP não testa a hipótese central (supplier não recebe lead). |
| Migrations | Script `run_migrations.cjs` | **Obsoleto.** Cobre apenas 001-012; o banco tem 33 migrations aplicadas via Management API manualmente. Sem tabela `schema_migrations` rastreando estado. Decisão pendente: adotar `supabase db push` ou atualizar o script. |
| Staging | (não decidido formalmente) | **Inexistente.** Previews da Vercel apontam para o mesmo projeto Supabase de produção. PRs em preview podem gravar dados reais. Bloqueante pré-go-live. |
| CI/CD | Vercel auto-deploy em `main` | **Confirmado em parte.** Vercel auto-deploy funciona; CI em `.github/workflows/` roda apenas `tsc --noEmit` + lint — sem build real, sem Playwright, sem branch protection rule. |
| Créditos cloud | Ativos desde já (hospedar pelo menos algo em produção) | **Confirmado.** |
| Carga horária Vitor | ~25h/semana (3h seg-sex + 5h sab + 5h dom) | **Confirmado.** |
| Token Supabase Management | (não previsto) | **Risco aberto:** `sbp_bc33261e...` foi exposto em sessões de chat. Aceito como risco enquanto banco está vazio; rotação obrigatória antes do primeiro deploy com dados reais. |

### Política de testes mínima antes de deploy em produção

Testes automatizados obrigatórios antes de qualquer deploy prod:
- **signup/login** (fluxo de autenticação completo)
- **criação de inquiry** (lead — coração do MVP)

Fora do conjunto mínimo: validação CNPJ (BrasilAPI) e UI. Podem ganhar testes depois, não bloqueiam deploy no MVP.

**Status (01/05/2026):** o conjunto mínimo **ainda não foi escrito**. Os specs Playwright existentes em `apps/web/tests/e2e/` cobrem `/explorar` pública e SEO técnico (`explorar-public.spec.ts`, `seo-sitemap.spec.ts`) — não cobrem signup/login nem criação de inquiry. Bloqueador estrutural: não há projeto Supabase de staging com seed de contas de teste para `globalSetup` do Playwright. **Deploy em produção hoje viola este critério.** Ver squad-fullstack 2026-05-01 e AVISOS.md.

---

## 9. Cronograma realista

Baseado em velocity combinada (Vitor ~25h/semana + Gustavo vibe coding em tarefas de casca) estimada em ~20-30 SP/semana. Arquitetura aprovada 16/04/2026; primeiras 2 sprints validam velocity real.

| Marco | Data realista | Condição |
|-------|---------------|----------|
| Setup inicial (repo, stack, CI, Supabase, Vercel) | +2 semanas | Arquitetura aprovada |
| Tier 1 completo (dev + QA) | +6-10 semanas | Setup pronto |
| Tier 2 parcial | +2-3 semanas | Tier 1 entregue |
| **MVP beta privado (Tier 1 + parte do Tier 2)** | **~final de junho / início de julho/2026** | Sem bloqueios maiores |
| Tier 3 com vibe coding do Gustavo | Em paralelo a partir do Tier 2 | Velocidade do Gustavo + disponibilidade dele |
| **Lançamento público (freemium sem cobrança recorrente)** | **~outubro/2026** | Tier 1 + 2 em produção, Tier 3 parcial |
| Monetização ativada (cobrança Pix/boleto manual primeiros 10-20 pagantes) | **~dezembro/2026** | Tração comprovada |
| Monetização automatizada (Stripe/Mercado Pago) | **~março/2027** | Fase 2 |

**Atenção:** prazos são faixas, não compromissos. Carga horária do Vitor e arquitetura foram formalizadas em 16/04/2026. Só viram compromisso depois de primeira sprint concluída com velocity medida.

---

## 10. Regras de manutenção deste doc

- **Alterações em Tier 1 ou Tier 2** requerem aprovação do Gustavo (CEO decide escopo).
- **Promoção Tier 3 → Tier 2 ou Tier 2 → Tier 1** requer reavaliação de prazo.
- **Adição de features novas** só se couber nos tiers existentes; caso contrário, vai pra "Fora do MVP".
- **Reler este doc no início de cada sprint** antes de pegar tarefa nova.
- Visão ampla e justificativas de negócio permanecem nos 27 docs técnicos. Este doc não substitui nenhum deles — é o recorte operacional.

---

## 11. Status de implementação — snapshot 01/05/2026

Reconciliação entre o escopo declarado e a realidade do código, derivada do squad-fullstack `work/2026-05-01/validacao-plataforma/brainstorm.md`. Atualizar a cada sessão de doc-sync.

### Tier 1 — divergências críticas

| # | Feature | Status | Observação |
|---|---------|--------|------------|
| 5 | Ativação buyer com checkbox LGPD | ⚠ **Bug ativo** | `lgpd_consent` é gravado server-side sem checkbox de compartilhamento com fornecedores. RF-01.08 não cumprido. Bloqueante legal pré-go-live. |
| 6 | Upgrade supplier com CNPJ via BrasilAPI | ⚠ **Desligado** | BrasilAPI desativada no MVP (instabilidade). Cadastro provisório sem validação externa. `is_company_verified` nunca acende para novos buyers até reativação. |
| 14 | Página pública do produto SSR + meta tags | ✅ Entregue | `/produto/[slug]` RSC com `generateMetadata` + JsonLd. |
| 15 | Página pública do fornecedor SSR + meta tags | ✅ Entregue | `/fornecedor/[slug]` idem. |
| 17 | Notificação e-mail da inquiry pro supplier (Resend) | 🔴 **Fake** | `enqueueInquiryNotification` insere row com `status='sent'` sem chamar SDK Resend. Bloqueante — MVP não testa hipótese central. |
| 20 | Rate limit 10 inquiries/dia por buyer | ✅ Entregue | Implementado em `create_directed_inquiry_tx` (Postgres). |
| 21 | Deduplicação inquiry 48h | ✅ Entregue | Idem item 20. |
| 22 | Admin dashboard mínimo | ✅ Entregue | (AVISOS 2026-04-21) |
| 23 | Admin: suspender/reativar supplier | ✅ Entregue | (AVISOS 2026-04-21) |

### Tier 2 — status

| # | Feature | Status |
|---|---------|--------|
| T2-1 | Selo "Empresa Verificada" buyer | ⚠ Schema entregue (migration 030); UI carrega o campo; render do badge no painel supplier não auditado |
| T2-4 | Schema.org JSON-LD | ✅ Entregue (sprint 2026-04-30) |
| T2-5 | Sitemap XML automático | ✅ Entregue (`app/sitemap.ts`, `app/robots.ts`) |
| T2-6 | Páginas SEO de categoria | ✅ Entregue (`/explorar/[categoria]` ISR + JSON-LD) |
| T2-10 | Login social Google | ✅ Entregue |
| T2-10b | Login Cert Digital A1 | ⚠ UI presente, backend é TODO — false affordance |
| T2-11 | Lista de necessidades | ⚠ Implementada com `features.needs = false` mas botão visível na Explorar |
| T2-12 | Gate de acesso "Pesquisa na web" | ✅ Implementada como gated |

### Implementado FORA do escopo declarado

Features presentes no código que MVP_SCOPE listava como "Fora do MVP" — promovidas de fato sem doc-sync formal. Decisão pendente: oficializar como Tier 1/2 ou retirar.

- **Pipeline bilateral** (migrations 021/022). Bug conhecido: cards do comprador não movem por dependência de título exato de coluna.
- **Propostas formais** com 7 campos estruturados (preço, prazo, frete, etc.) — Tier 1 previa apenas descrição+quantidade+prazo+localidade.
- **Chat** entre buyer/supplier (migration 013).
- **FTS com ranking composto 35/25/15/15/10** (migrations 032/033). RPC `search_explorar` aplicada no banco mas `/api/search` ainda usa ILIKE.
- **Inquiries genéricas** (migration 018) — multi-fornecedor.
- **Abas "Pesquisas" e "Análises com IA"** em `/painel/inquiries` (sem RF documentado).
- **Layer de analytics tipada** (`lib/analytics/track.ts` + 6 eventos) — noop em produção (TODO: plugar PostHog ou similar).
- **Refator security** removendo SERVICE_ROLE de endpoint público (migration 031 + view `search_needs_public`).

### Páginas institucionais — pendentes (RF-14.01)

`/sobre`, `/como-funciona`, `/contato`, `/precos` retornam 404. Risco de credibilidade B2B para tráfego orgânico.

### Riscos operacionais documentados em ARCHITECTURE.md

- 21 das 33 migrations sem rastreamento (`run_migrations.cjs` obsoleto).
- Token Supabase Management exposto sem rotação.
- Staging Supabase inexistente (previews tocam prod).
- CI sem build do Next.js nem Playwright.
- Sentry no-op (DSN ausente em prod).
- ARCHITECTURE.md preenchido na v2.0 (01/05/2026); v1.0 era template em branco.
