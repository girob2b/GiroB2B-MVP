# GiroB2B — Casos de uso (user journeys)

> Mapa canônico dos fluxos da plataforma. Input pro DS (quais components precisam existir),
> pro QA (quais fluxos testar end-to-end) e pra produto (onde o usuário pode travar).
>
> Fonte: derivado do [MVP_PIVOT_2026-05-07.md](today/MVP_PIVOT_2026-05-07.md) + decisões
> de produto de 2026-05-14/15/18.
>
> Criado: 2026-05-22. Última revisão: 2026-05-22.

---

## 0. Princípios

1. **Caminho curto até valor.** Default em UX é reduzir fricção entre intenção e ação.
2. **Cadastro progressivo.** Comprador publica como guest se quiser; só pede dados quando o valor extra justifica.
3. **WhatsApp é o canal único.** Sem chat interno, sem pipeline na plataforma. Plataforma orquestra o contato, conversa acontece fora.
4. **Vendedor é gateado por admin.** Não-vendedor não vê feed. Admin aprova manualmente até o pagamento automatizado entrar.
5. **Toda transição é reversível.** "Voltar" e "Pular" sempre disponíveis. Sessão não força funil.

---

## 1. Personas

| Persona | Estado inicial | O que quer fazer |
|---|---|---|
| **Visitante comprador novo** | Anônimo, sem cadastro | Publicar uma necessidade B2B e receber contato de fornecedor |
| **Visitante comprador recorrente** | Email já existe na base (waitlist ou cadastro) | Publicar nova necessidade / gerenciar publicadas |
| **Visitante vendedor novo** | Anônimo, sem CNPJ aprovado | Entrar na lista de espera pra ter acesso ao feed |
| **Vendedor aprovado** | CNPJ aprovado pelo admin, trial ou assinatura ativa | Filtrar feed, contatar compradores via WhatsApp |
| **Vendedor aprovado expirado** | Trial/assinatura expirou | Ver preview do feed mas não consegue contatar |
| **Admin** | Login no `admin.girob2b.com.br` | Aprovar/suspender supplier, ativar trial, ver dashboard |

---

## 2. Fluxos principais

### Fluxo 1 — Comprador novo via landing

**Persona:** visitante comprador novo
**Trigger:** abre `girob2b.com.br` (landing), clica "Quero comprar" no hero ou modal

**Steps:**

1. **Landing /** — modal `WaitlistModal` aberto, role default = `buyer`
2. **Submit** (email + CNPJ + categoria + LGPD) → `submitSupplier()` no Supabase
   - Backend valida CNPJ válido + email único
   - Insere linha em `waitlist` com `role='buyer'`
   - Retorna `{ ok: true, status: 'created' }`
3. **WaitlistResultModal variant=`buyer_created`** — título "Tudo certo! Vamos te cadastrar", CTA "Continuar →"
4. **Redirect** → `${APP_URL}/postar?email=<email>&auth=register`
5. **App /postar** — form de publicação carrega com email pré-preenchido; `AuthModalRoot` lê `?auth=register` e abre modal de cadastro por cima
6. **Modal de cadastro** — `BuyerRegisterForm` mostra:
   - Card chamativo "Continuar sem cadastro" no topo (fecha o modal e mantém no /postar)
   - Form de email + senha + LGPD
7. **Caminho A (cria conta):** submit → Supabase auth → email de confirmação enviado → tela "Verifique seu email" → user confirma via email → `/auth/callback` → cria sessão → redirect `/painel/postar` (autenticado)
8. **Caminho B (pula):** clica "Continuar sem cadastro" → modal fecha → preenche o form de `/postar` (guest) → submit publica como guest (1 necessidade/email)

**Estados de exit:**
- ✅ Conta criada + necessidade publicada → `/painel`
- ✅ Publicou como guest → `/postar/sucesso` (com aviso "pra publicar mais, [crie conta]")
- ❌ Abandonou em qualquer step → sem registro persistente além da linha de waitlist

**Telemetria mínima:** `waitlist_buyer_submit` → `signup_started` → `signup_completed` OU `guest_publish_started` → `guest_publish_completed`

**Acessível por:** público

---

### Fluxo 2 — Comprador recorrente via landing

**Persona:** visitante comprador recorrente (email já existe)
**Trigger:** mesmo da Fluxo 1 — clica "Quero comprar"

**Steps:**

1. **Landing /** — modal `WaitlistModal` aberto
2. **Submit** → `submitSupplier()` → Postgres rejeita com `23505` (unique violation)
3. **WaitlistResultModal variant=`buyer_already_exists`** — título "Você já tem cadastro com a gente", CTA "Fazer login →"
4. **Redirect** → `${APP_URL}/login?email=<email>`
5. **App /login** (rota dedicada, NÃO redireciona pra `/explorar` porque tem `?email=`):
   - Card chamativo "Continuar sem login" no topo (vai pra `/postar?email=<email>`)
   - Form de login com email pré-preenchido
6. **Caminhos:**
   - A) Faz login → `/painel` (suas necessidades, opção de publicar nova)
   - B) Pula → `/postar?email=<email>` (publica guest se ainda não atingiu limite)
   - C) Esqueceu senha → `/recuperar-senha`

**Estados de exit:** logado / publicou guest / pediu recover

**Acessível por:** público

---

### Fluxo 3 — Vendedor novo via landing

**Persona:** visitante vendedor novo
**Trigger:** clica "Sou vendedor" no header da landing ou hero CTA secundário

**Steps:**

1. **Landing /** — modal `WaitlistModal` aberto com role pré-selecionado `supplier`
2. **Submit** (email + CNPJ + categoria + LGPD) → `submitSupplier()` insere `role='supplier'`
3. **WaitlistResultModal variant=`supplier_created`** — título "Você está na lista de espera", body explica que admin avalia + envia link de acesso por email, CTA "Fechar"
4. **Aguarda** — não há redirect. User sai da landing.

**O que acontece em background:**
- Linha em `waitlist` com `role='supplier'`, `status='pending'`
- Admin recebe no dashboard de waitlist queue
- Admin aprova manualmente → manda email com link de cadastro (V1 manual; V2 automatizado via Resend)

**Estados de exit:**
- ✅ Email entrou na waitlist + closed modal
- ❌ Validação falhou (CNPJ inválido, email duplicado, etc) → toast inline

**SLA atual:** admin avalia em até 48h (manual, sem automação)

**Acessível por:** público

---

### Fluxo 4 — Vendedor recorrente (email já existe)

**Persona:** vendedor que já está na waitlist
**Trigger:** mesmo do Fluxo 3

**Steps:**

1-2. Idem Fluxo 3 até `submitSupplier()` que falha com `23505`
3. **WaitlistResultModal variant=`supplier_already_exists`** — título "Você já está na lista de espera", body "estamos avaliando", CTA "Entrar em contato" → `mailto:comercial@girob2b.com.br` (subject + body pré-formatados)

**Estados de exit:** abriu mailto / closed modal

**Acessível por:** público

---

### Fluxo 5 — Vendedor aprovado (primeiro acesso)

**Persona:** vendedor que foi aprovado pelo admin
**Trigger:** recebe email com link de acesso

**Steps:**

1. **Email** com link `${APP_URL}/seja-vendedor/aprovado?token=<token>` (V1 manual: admin envia email direto)
2. **/seja-vendedor/aprovado** — confirma identidade, cria senha
3. **Cadastro completo** → admin (ou trigger) seta `subscription_status='trialing'` com `trial_ends_at = now() + 7 days`
4. **Redirect** → `/painel/leads`
5. **/painel/leads** — feed de necessidades com:
   - Filtros: categoria, UF, kind (simple/structured)
   - Selo "Verificado" nos compradores com CNPJ verificado
   - Botão "Contatar via WhatsApp" em cada card (abre `wa.me/<phone>?text=<mensagem-pronta>`)
6. **Clica contatar** → audit em `demand_contacts` (RPC `register_demand_contact`) → abre WhatsApp em nova aba

**Gates de acesso ao botão de contato:**
1. Autenticado? ❌ → redirect `/login`
2. É supplier? ❌ → redirect `/seja-vendedor`
3. `subscription_status` ∈ {trialing, active}? ❌ → toast "Trial expirado, renovar" + link

**Estados de exit:**
- ✅ Contatou comprador → WhatsApp aberto, audit gravado
- ✅ Apenas explorou feed → sessão preservada
- ❌ Trial expirou durante sessão → bloqueado no próximo click

**Acessível por:** autenticado + role=supplier + assinatura ativa/trial

---

### Fluxo 6 — Vendedor expirado

**Persona:** vendedor com `subscription_status='expired'`
**Trigger:** entra em `/painel/leads` após expiração

**Steps:**

1. **/painel/leads** — feed continua visível (modo preview: títulos, categoria, UF, prazo)
2. Detalhes obscurecidos: quantidade, orçamento, descrição completa, WhatsApp do comprador → mostra paywall
3. Botão "Contatar" → bloqueado, abre modal "Trial expirado / Renove sua assinatura"
4. CTAs: "Renovar agora" (V2: Stripe/MP checkout) ou "Falar com comercial" (mailto)

**Estados de exit:** renovou / abandonou / pediu contato comercial

**Acessível por:** autenticado + role=supplier (expirado)

---

### Fluxo 7 — Admin: aprovar supplier da waitlist

**Persona:** admin
**Trigger:** login em `admin.girob2b.com.br` → vê queue de waitlist

**Steps:**

1. **/admin/login** → autentica (gate adicional: só users com `is_admin=true`)
2. **/admin/waitlist** — lista de pedidos `status='pending'`, ordenados por created_at
3. Cada linha: email, CNPJ (link pra BrasilAPI no V2), categoria, source, criada_há_X
4. **Ações:**
   - **Aprovar** → admin envia email manual (V1) com link de cadastro; seta `status='approved'`
   - **Copiar email** → clipboard, pra colar em template manual
   - **Suspender supplier ativo** → seta `subscription_status='inactive'`
   - **Ativar trial 7d** → seta `subscription_status='trialing'`, `trial_ends_at = now()+7d`
5. **Filtros:** role (buyer/supplier), status, categoria, data

**Acessível por:** `is_admin=true` only. Subdomínio separado `admin.girob2b.com.br` (cookie auth separado pra defesa em camadas).

---

## 3. Edge cases obrigatórios

### 3.1 Email duplicado entre roles
- User cadastrou como buyer; agora tenta como supplier com mesmo email
- Constraint `(email, cnpj)` unique no banco → segundo insert falha com 23505
- UX: WaitlistResultModal `supplier_already_exists` mostra "Você já está na lista" — não revela se foi como buyer ou supplier (anti-enumeration)

### 3.2 CNPJ inválido
- Validação client-side: regex 14 dígitos + checksum
- BrasilAPI desligada no MVP (memory: `project_brasilapi_disabled_in_mvp`) — só valida checksum, não verifica situação cadastral
- V2: re-validar a cada 90 dias quando BrasilAPI voltar

### 3.3 Guest com email duplicado
- Comprador anônimo já publicou 1 necessidade como guest com email X
- Tenta publicar 2ª necessidade com mesmo email → backend rejeita com mensagem "Para publicar mais, crie conta"
- CTA pra `/?auth=register` com email pré-preenchido

### 3.4 Trial expirado durante sessão
- Supplier logado, trial expira meio da sessão (>7 dias)
- Próximo click em "Contatar" → backend nega via gate de assinatura → toast + modal "Trial expirado"
- Feed continua visível em modo preview

### 3.5 Email do callback de auth falhou
- User clica link de confirmação, callback dá erro (link expirado / já usado)
- Redirect `/login?error=link_expirado` → mostra mensagem específica + CTA "Reenviar"

### 3.6 Comprador publica + não cria conta + admin precisa contatar
- Demand existe com `guest_email` + `guest_whatsapp` mas sem `buyer_id`
- Admin tem acesso a guest_email no painel
- Vendedor que contatar via WhatsApp usa o `guest_whatsapp` (sem buyer_id na auditoria — registra apenas `demand_id` + `supplier_id`)

### 3.7 LGPD revogação
- User pede pra deletar dados (LGPD Art. 18)
- Admin: soft-delete em `buyers`/`suppliers`, hard-delete em `demands` órfãs após 30d
- Audit log: registra request + timestamp
- V2: self-service em `/painel/configuracoes/privacidade`

### 3.8 Pagamento expirado pra renovação
- Supplier tem trial expirado, abre modal de renovação
- Tenta pagar, cartão recusado
- Mantém `subscription_status='expired'`, mostra toast "Pagamento falhou"
- V2: re-tentar 3x em 7 dias antes de considerar churn

---

## 4. Telas envolvidas (inventory)

| URL | Persona | Tipo |
|---|---|---|
| `girob2b.com.br/` (landing) | Visitante | Marketing |
| `girob2b.com.br/seja-vendedor` (landing) | Visitante vendedor | Marketing |
| `app.girob2b.com.br/` | Comprador anônimo | App view do comprador |
| `app.girob2b.com.br/postar` | Anônimo / autenticado | Form de publicação |
| `app.girob2b.com.br/cadastro` | Anônimo | Auth |
| `app.girob2b.com.br/login` | Anônimo | Auth |
| `app.girob2b.com.br/recuperar-senha` | Anônimo | Auth |
| `app.girob2b.com.br/redefinir-senha` | Anônimo (com token) | Auth |
| `app.girob2b.com.br/auth/callback` | Confirmando email | Auth |
| `app.girob2b.com.br/painel` | Autenticado | Dashboard (redireciona por papel) |
| `app.girob2b.com.br/painel/postar` | Comprador logado | Form completo |
| `app.girob2b.com.br/painel/necessidades` | Comprador logado | Lista das próprias necessidades |
| `app.girob2b.com.br/painel/leads` | Vendedor aprovado | Feed de necessidades |
| `app.girob2b.com.br/necessidade/[slug]` | Público (SSR + JSON-LD) | Detalhe pra SEO |
| `app.girob2b.com.br/buscar` | Vendedor aprovado | Busca filtrada |
| `app.girob2b.com.br/categoria/[slug]` | Vendedor aprovado | Feed por categoria |
| `app.girob2b.com.br/fornecedor/[slug]` | Público | Perfil de vendedor (V2 — desligado no MVP) |
| `admin.girob2b.com.br/login` | Admin | Auth |
| `admin.girob2b.com.br/waitlist` | Admin | Queue de aprovação |
| `admin.girob2b.com.br/necessidades` | Admin | Moderação |
| `admin.girob2b.com.br/dashboard` | Admin | Métricas |

---

## 5. Métricas-chave por fluxo (Telemetria mínima)

| Fluxo | Event | Onde dispara |
|---|---|---|
| 1, 2, 3, 4 | `waitlist_submit_attempt` | submitSupplier inicia |
| 1, 3 | `waitlist_submit_success` | created |
| 2, 4 | `waitlist_submit_duplicate` | 23505 |
| 1 | `signup_started` | `?auth=register` abre modal |
| 1 | `signup_completed` | email confirmado |
| 1 | `guest_publish_started` | "Continuar sem cadastro" clicado |
| 1 | `guest_publish_completed` | demand criada com `guest_email` |
| 2 | `login_started` | submit do login form |
| 2 | `login_skip_clicked` | "Continuar sem login" clicado |
| 5 | `lead_contact_clicked` | botão WhatsApp clicado |
| 5 | `lead_contact_completed` | RPC `register_demand_contact` ok |
| 7 | `admin_approve_supplier` | admin aprova |
| 7 | `admin_activate_trial` | admin ativa trial 7d |
| 7 | `admin_suspend_supplier` | admin suspende |

**Storage:** tabela `analytics_events` (V2 — ainda não criada).
**V1:** logs estruturados no Vercel + GA4 já existente.

---

## 6. Decisões abertas que afetam os fluxos

(rastreadas em [AVISOS.md](../AVISOS.md) — pendentes pra go-live)

1. **Preço da assinatura do vendedor** — landing mostra R$89 Start / R$349 Pro (Fluxo 5/6 depende)
2. **Gateway de pagamento** — Stripe ou Mercado Pago. Recomendação: MP (PIX nativo BR). Fluxo 6 depende.
3. **Ativação automatizada de supplier** — hoje admin manda email manual. V2: Resend automatizado quando admin clica "Aprovar". Fluxo 7 depende.
4. **Filtro geográfico no feed** — default vê tudo. Granularidade futura: estado / cidade. Fluxo 5 depende.
5. **Revisão jurídica do texto LGPD** — `demand-publish-v1-2026-05-07` ainda sem revisão.
6. **Rotacionar Supabase Management Token** — pré-go-live.
7. **Email de confirmação Resend ligado** — hoje Supabase manda email default. V2: template GiroB2B via Resend.

---

## 7. Components que os fluxos exigem (input pro DS site)

> Esta seção é a entrada direta pra Fase 2 do DS. Cada item será coberto no DS mini-site.

### Primitives (já existem em `apps/web/components/ui/`)
- `Button` (variants: primary, secondary, accent, ghost, outline, danger; sizes: compact, default, comfortable)
- `Input`, `Label`, `Textarea`, `Select`, `Checkbox`
- `Card` (base, hover)
- `Dialog`, `DialogHeader`, `DialogTitle`, `DialogDescription`
- `Badge`, `ResoldBadge` (status)
- `Avatar`
- `Tabs`, `Separator`
- `Skeleton`, `PageSkeleton`
- `Progress`
- `Sonner` (toaster)
- `GiroLoader`, `GiroLogo`

### Compostos (Fase 3)
- `WaitlistModal` (landing, separado por stack)
- `WaitlistResultModal` (landing, 4 variants)
- `AuthDialog` (web — login/register)
- `SupplierWaitlistModal` (web — `?waitlist=supplier`)
- `QuickPublishForm` (home)
- `DemandCard` (feed)
- `DemandForm` (full + structured)
- `GuestDemandForm` (sem auth)
- `BuyerRegisterForm` (com skip embedded)
- `LoginForm` (com prefill + skip embedded)
- `SupplierWaitlistForm`

### Patterns (Fase 3)
- `PageHeader` — h1 + breadcrumb + actions
- `EmptyState` — quando lista vazia
- `FormSection` — section + label + help + errors
- `DataTable` (admin) — sort, filter, paginate
- `Topbar` — variants por persona (guest, buyer, supplier, admin)
- `Sidebar` (V2 — hoje topbar-only)

### Alerts (já em globals.css)
- `.alert-success`, `.alert-warning`, `.alert-error`, `.alert-info`

---

## 8. Tabela de cobertura: fluxo × tela × component

(Resumo do que precisa estar pronto e testado pra MVP funcionar end-to-end)

| Fluxo | Telas | Components críticos | Status |
|---|---|---|---|
| 1. Buyer novo | landing /, /postar, /cadastro (modal), /painel | WaitlistModal, WaitlistResultModal, BuyerRegisterForm, GuestDemandForm, QuickPublishForm | ✅ implementado |
| 2. Buyer recorrente | landing /, /login | WaitlistModal, WaitlistResultModal, LoginForm (com prefill+skip) | ✅ implementado |
| 3. Supplier novo | landing /, sem retorno | WaitlistModal, WaitlistResultModal | ✅ implementado |
| 4. Supplier recorrente | landing /, sem retorno | WaitlistModal, WaitlistResultModal (mailto) | ✅ implementado |
| 5. Supplier aprovado | /painel/leads, /necessidade/[slug] | DemandCard, gates de subscription, contactDemandAction (WhatsApp) | ✅ implementado |
| 6. Supplier expirado | /painel/leads (preview), modal de paywall | Modal de paywall, gates | 🟡 V1: bloqueia botão; V2: paywall completo |
| 7. Admin | admin/waitlist, admin/necessidades | DataTable, ações de aprovar/suspender/trial | ✅ implementado |

---

## 9. Próximos passos

- [ ] Atualizar [AVISOS.md](../AVISOS.md) com decisões abertas da seção 6
- [ ] DS mini-site (Fase 2): cobrir todos os primitivos + compostos da seção 7
- [ ] QA: produzir Playwright suite cobrindo os 7 fluxos + 8 edge cases
- [ ] V1.1: implementar modal de paywall do Fluxo 6 (hoje só bloqueia botão)
- [ ] V2: automação do Fluxo 7 (email Resend automatizado quando admin aprova)
