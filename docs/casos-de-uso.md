# GiroB2B — Casos de uso (user journeys)

> Mapa canônico dos fluxos da plataforma. Input pro DS (quais components precisam existir),
> pro QA (quais fluxos testar end-to-end) e pra produto (onde o usuário pode travar).
>
> Fonte: derivado do [MVP_PIVOT_2026-05-07.md](today/MVP_PIVOT_2026-05-07.md) + decisões
> de produto até 2026-05-24 (consolida PRs #3-9).
>
> Criado: 2026-05-22. Atualizado: 2026-05-24 (v2).
>
> **Mudanças desde v1:**
> - `both` removido da plataforma (migration 044 ✅ aplicada)
> - "Sou vendedor" volta no header da raiz, gateado pela waitlist aprovada
> - Tutorial primeiro-login com driver.js (3 passos por role)
> - Approval token na waitlist pra cadastro pós-aprovação (migration 045 ✅ aplicada)
> - Header autenticado por role: comprador minimalista, vendedor com search dominante

---

## 0. Princípios

1. **Caminho curto até valor.** Default em UX é reduzir fricção entre intenção e ação.
2. **Cadastro progressivo.** Comprador publica como guest se quiser; só pede dados quando o valor extra justifica.
3. **WhatsApp é o canal único.** Sem chat interno, sem pipeline na plataforma.
4. **Vendedor é gateado por admin.** Não-vendedor não vê feed. Admin aprova manualmente até pagamento automatizado entrar.
5. **Modo binário** (decisão 2026-05-24). Cada user é comprador OU vendedor — nunca os dois ao mesmo tempo. Troca via fluxo dedicado em `/painel/perfil` (aprovação admin + cooldown 2d).
6. **Toda transição é reversível.** "Voltar" e "Pular" sempre disponíveis. Tutorial primeiro-login tem skip imediato.

---

## 1. Personas

| Persona | Estado inicial | Onde aparece |
|---|---|---|
| **P1 — Visitante comprador novo** | Anônimo | landing + app/ |
| **P2 — Visitante comprador recorrente** | Email já publicou guest | app/postar (rejeita) → /login |
| **P3 — Comprador criando conta** | Vindo do guest, decide cadastrar | modal `?auth=register` sobre /postar |
| **P4 — Comprador logado recorrente** | Tem conta, volta pra publicar mais | /painel/necessidades |
| **P5 — Visitante vendedor novo** | Anônimo, sem waitlist | landing externa ou /seja-vendedor |
| **P6 — Admin** | `is_admin=true` | admin.girob2b.com.br |
| **P7 — Vendedor aprovado primeiro acesso** | Recebeu email da admin | /seja-vendedor → /cadastro/vendedor |
| **P8 — Vendedor com trial/assinatura ativa** | `subscription_status` ∈ {trialing, active} | /painel/leads |
| **P9 — Vendedor expirado** | `subscription_status='expired'` | /painel/leads em modo preview |
| **P10 — Vendedor recorrente clicando "Já fui aprovado"** | Já criou conta antes | Edge — abortado no signup |

---

## 2. Fluxos detalhados

### P1 — Visitante comprador novo

**Cenário:** Visitante chega no `app.girob2b.com.br/` direto (não via landing).

```
1. /  (GuestShell):
   Header: [GiroB2B] [Publicar necessidade] [Sou vendedor] [Entrar]
                                             ↑ só aparece na raiz (PR #7)
   Hero: "O que você precisa comprar?" + quick form (Título / Categoria / UF)

2. Digita só o título → clica Publicar
   ↳ PR #5 H-1: botão habilitado sempre; submit vazio mostra hint inline "Comece pelo título"

3. → /postar?title=<preserved>
   Header muda: [GiroB2B] [Entrar] [Criar conta]   (PR #3 — sem "Publicar" redundante)
   Banner amber: "Sem cadastro = 1 publicação. Crie conta grátis pra mais"

4. Form de /postar — todos os required marcados com * vermelho (PR #5 H-2):
   * Seu nome   * Email   * WhatsApp   * Título   * LGPD
   Opcionais: Descrição, Categoria, Quantidade, Unidade, Orçamento, Prazo, Cidade, UF

5. Submit → server action createGuestDemandAction:
   - cria demand (kind=simple, guest_email, guest_whatsapp, guest_name)
   - slug derivado do título
   - LGPD consent gravado (version + timestamp)

6. → /necessidade/<slug>?guest_published=1
   - PR #4 evita TypeError quando description é null
   - Vê a própria publicação live + aviso "Pra publicar mais, [crie conta]"
```

**Estado de saída:** 1 demand publicada, vendedores aprovados podem contatar via `guest_whatsapp`.

---

### P2 — Visitante comprador recorrente (email já publicou)

**Cenário:** Tenta publicar 2ª como guest com mesmo email.

```
1-4. Idem P1 até submit
5. Server rejeita: "Esse email já publicou. Faça login pra gerenciar."
6. CTA → /login?email=<email>
7. User segue P4 (login) ou abandona
```

---

### P3 — Comprador criando conta (durante /postar)

**Cenário:** Decide criar conta antes de finalizar publicação.

```
1. Em /postar, clica "Crie conta grátis" do banner amber
   → ?auth=register (relativo, PR #5 H-4 — NÃO sai pra /)
   → AuthDialog modal abre por cima do form

2. Modal mostra (BuyerRegisterForm):
   - Card verde topo: "Continuar sem cadastro" (Zap icon)
   - Form: Email / Senha / Confirmar / LGPD ✓

3. Caminho A — Cria conta:
   - signUp → Supabase envia email_confirm
   - Tela "Verifique seu email"
   - Clica link no email → /auth/callback → cria sessão
   - → /painel/postar (form completo)

   Caminho B — Pula:
   - Clica "Continuar sem cadastro"
   - Modal fecha, mantém em /postar guest
   - Completa P1 normalmente

4. Logado + redirect /painel → TUTORIAL DISPARA (PR #8):
   - Step 1: highlight [Publicar] — "👋 Bem-vindo! Este é seu botão principal..."
   - Step 2: highlight [Necessidades] — "Suas publicações vivem aqui..."
   - Step 3: highlight avatar — "Configure perfil + selo Verificado"
   - Pular (X / ESC) grava timestamp; não pergunta de novo
```

---

### P4 — Comprador logado recorrente

```
1. /login → digita credenciais → /painel
2. middleware (PR #6): role=buyer → /painel/necessidades

3. Header autenticado (PR #6):
   [GiroLogo] [Publicar] [Necessidades] [Avatar▾]
   Avatar dropdown: Meu perfil + Dashboard + Sair

4. /painel/necessidades:
   - Lista das próprias demands (própria empresa, sem feed de outras)
   - Cada card: Status / Visualizações / Contatos recebidos / Botão Editar
   - Botão "Publicar nova" no topo

5. Publicar nova → /painel/postar
6. Submit → demand criada com buyer_id (não-guest)
```

---

### P5 — Visitante vendedor novo

**Cenário:** Maria da ABC quer entrar como vendedora.

```
Origem A — Via landing externa girob2b.com.br
  Clica "Quero vender" → modal WaitlistModal (role default: supplier)

Origem B — Via app.girob2b.com.br/
  Clica "Sou vendedor" no header (PR #7, só na raiz)
  → /seja-vendedor (app interno)

Em /seja-vendedor (PR #9):
  [TOPO] Card dourado "Já fui aprovado ✨" + botão "Verificar meu email"
  [HERO] Pitch à esquerda + SupplierWaitlistForm à direita
  [SEÇÕES] Como funciona / Planos / CTA final

1. Maria não foi aprovada ainda — preenche SupplierWaitlistForm:
   Email + CNPJ + Categoria + LGPD + consent_marketing
2. Submit → INSERT waitlist(role='supplier', status='pending')
3. Vê: "Você está na lista — vamos avaliar e te enviar acesso por email"
```

**Sai do fluxo público.** Aguarda admin aprovar.

---

### P6 — Admin aprova supplier

```
1. admin.girob2b.com.br/login (subdomínio separado, cookie auth próprio)
2. /admin/waitlist — fila de pedidos status=pending
   Cada linha: email, CNPJ, categoria, source, age, ações

3. Ações por linha:
   [Aprovar]            UPDATE waitlist SET status='approved'
   [Copiar email]       clipboard
   [Suspender]          (pra suppliers ativos)
   [Ativar trial 7d]    seta subscription_status='trialing' no cadastro

4. V1 manual: admin manda email pra Maria avisando:
   "Pode acessar app.girob2b.com.br/seja-vendedor → Já fui aprovado"
   V2 (futuro): Resend automatizado quando admin clica Aprovar
```

---

### P7 — Vendedor aprovado, primeiro acesso

```
1. Abre app.girob2b.com.br/seja-vendedor
2. Clica "Verificar meu email" no card dourado → modal
3. Digita maria@abc.com.br → submit
   → POST /api/waitlist/check (PR #9):
     - lookup waitlist(email, role='supplier')
     - valida status='approved' AND não-suspended
     - gera approval_token (UUID 15min uso único) salvo no row

4. UI verde: "Tudo certo! Você está aprovado." + botão "Continuar pra criar conta"
   → /cadastro/vendedor?supplier_token=<uuid>

5. /cadastro/vendedor (PR #9, server page):
   Re-valida token (defesa em profundidade):
     ✓ existe? ✓ não-expirado? ✓ não-usado? ✓ status='approved'?
   Se OK, renderiza SupplierSignupForm com:
     - Email (read-only, vem da waitlist)
     - CNPJ (read-only)
     - Categoria (read-only)
     - Nome (input)
     - Senha (mínimo 8)
     - LGPD ✓

   Se NÃO, renderiza <InvalidToken> com motivo específico
   (6 motivos: missing, malformed, not_found, not_approved, used, expired)

6. Submit → createSupplierFromApprovedWaitlist:
   - Re-valida token + match de email
   - admin.auth.createUser (email_confirm=true, segment='supplier')
   - INSERT suppliers (subscription_status='inactive')
   - UPDATE waitlist SET approval_token_used_at=now()
   - Rollback (delete user) se falha tardia

7. → /login?status=cadastro_concluido
8. Login → /painel → middleware: supplier → /painel/leads
9. Header autenticado supplier (PR #6):
   [GiroLogo] [INPUT DE BUSCA DOMINANTE] [Avatar▾]
                                          ↑ Avatar contém:
                                            - Material de venda
                                            - Perfil público
                                            - Dashboard
                                            - Feed de necessidades

10. Aviso topo da página: "Assinatura inativa — preview do feed"
    + CTA "Falar com comercial" (admin libera trial separadamente)

11. TUTORIAL DISPARA (PR #8):
    Step 1: highlight input busca — "👋 Bem-vindo! Busque por produto/categoria"
    Step 2: highlight avatar — "Material de venda, perfil público, assinatura"
    Step 3: tela final — "Pronto! Bora encontrar leads?"
```

---

### P8 — Vendedor com trial/assinatura ativa

```
1. Maria volta logada, subscription_status='trialing' (admin ativou)
2. /painel/leads → feed completo

3. Topbar input — digita "papelão" + Enter
   → router.replace('/painel/leads?q=papelão', {scroll:false})
   (mesma rota = só filtra; rota diferente = router.push)

4. Vê DemandCard:
   - Título, Categoria, Quantidade, UF, Prazo
   - Selo "Verificado" se buyer_is_verified
   - Botão "Contatar via WhatsApp"

5. Clica Contatar:
   Gates server-side: auth → supplier role → subscription ativa
   RPC register_demand_contact (audit log)
   window.open(wa.me/<phone>?text=<msg>)

6. Vendedor negocia direto. Fora da plataforma.
```

---

### P9 — Vendedor expirado

```
1. trial expirou (após 7d) ou assinatura caiu
2. /painel/leads continua acessível em modo PREVIEW:
   - Títulos, categoria, UF visíveis
   - Quantidade, orçamento, descrição completa borrados/ocultos
   - Botão "Contatar" disabled

3. Clica Contatar → modal "Trial expirado, renove"
   V1: mailto:comercial@girob2b.com.br
   V2: Stripe/MP checkout (decisão aberta)
```

---

### P10 — Edge: vendedor recorrente abusando "Já fui aprovado"

```
1. Maria já criou conta antes (approval_token_used_at preenchido)
2. Volta em /seja-vendedor → digita email aprovado
3. Backend gera NOVO token (reset OK)
4. Submit do form em /cadastro/vendedor → server action falha:
   admin.auth.createUser retorna "already registered"
5. Erro UI: "Esse email já tem conta. Faça login."
   → CTA /login
```

---

## 3. Edge cases obrigatórios

1. **Email duplicado entre roles** — buyer já existe, tenta supplier com mesmo email.
   - Constraint `(email, cnpj)` unique no banco → 23505. UX anti-enumeration.

2. **CNPJ inválido** — validação client-side checksum. BrasilAPI desligada no MVP.

3. **Guest com email duplicado** — backend rejeita, sugere `/?auth=register&email=<email>`.

4. **Trial expirou durante sessão** — gate server-side, próximo click em "Contatar" cai em paywall.

5. **Email callback falhou** — `/login?error=link_expirado` mostra mensagem + CTA reenviar.

6. **Demand guest sem buyer_id** — admin vê o `guest_email/whatsapp` direto no painel.

7. **LGPD revogação** — admin soft-delete buyers/suppliers + hard-delete demands órfãs >30d. V2: self-service.

8. **Pagamento expirado pra renovação** — toast "Falhou", retry 3x em 7d antes de churn (V2).

9. **Token de aprovação expirado** (P7) — 15min de validade. `<InvalidToken reason="expired">` com link pra gerar novo via /seja-vendedor.

10. **Token de aprovação já usado** (P10) — auto-bloqueio na server action de signup; UI redireciona pra /login.

11. **Race condition na aprovação** — admin aprova, depois suspende antes do user criar conta. O server re-valida `status='approved'` no submit; se mudou pra 'rejected'/'suspended', recusa com mensagem clara.

---

## 4. Tutorial primeiro-login (PR #8)

### Gatilho
Server lê `user_metadata.tutorial_completed_at`. Se null → passa `showTutorial=true` ao DashboardShell → monta `<TutorialRunner role="buyer|supplier" />` via dynamic import.

### Comportamento
- driver.js v1.4 com 3 steps por role
- Animação suave (smooth scroll + fade ~150ms)
- Box-shadow accent gold no elemento ativo
- Overlay 55% brand-primary-800
- Botão "Pular" sempre disponível (X / ESC)
- Skip e completo gravam mesmo timestamp via `markTutorialCompleted()` server action — não pergunta de novo

### Steps

**Comprador:**
1. `[data-tutorial="nav-publicar"]` — "👋 Bem-vindo! Este é seu botão principal..."
2. `[data-tutorial="nav-necessidades"]` — "Suas publicações vivem aqui..."
3. `[data-tutorial="account-dropdown"]` — "Complete perfil + selo Verificado..."

**Vendedor:**
1. `[data-tutorial="supplier-search"]` — "Busque por produto/categoria..."
2. `[data-tutorial="account-dropdown"]` — "Material de venda, perfil, assinatura..."
3. Centralizado — "Pronto! Bora encontrar leads?"

### Honra a11y
- `prefers-reduced-motion: reduce` → sem transform hover
- ARIA built-in do driver.js

---

## 5. Telas envolvidas (inventory)

| URL | Persona | Tipo | PR |
|---|---|---|---|
| `girob2b.com.br/` (landing) | Visitante | Marketing externo | — |
| `girob2b.com.br/seja-vendedor` (landing) | Visitante vendedor | Marketing externo | — |
| `app.girob2b.com.br/` | Comprador anônimo | App view do comprador | #5, #7 |
| `app.girob2b.com.br/postar` | Anônimo / autenticado | Form de publicação | #3, #5 |
| `app.girob2b.com.br/cadastro` | Anônimo | Auth (comprador) | — |
| `app.girob2b.com.br/cadastro/vendedor` | Anônimo c/ token | Auth (vendedor pós-aprovação) | **#9 novo** |
| `app.girob2b.com.br/login` | Anônimo | Auth | — |
| `app.girob2b.com.br/recuperar-senha` | Anônimo | Auth | — |
| `app.girob2b.com.br/redefinir-senha` | Anônimo (com token) | Auth | — |
| `app.girob2b.com.br/auth/callback` | Confirmando email | Auth | — |
| `app.girob2b.com.br/seja-vendedor` | Anônimo / aprovado | Marketing + gate | **#9** |
| `app.girob2b.com.br/painel` | Autenticado | Redireciona por role | #6 |
| `app.girob2b.com.br/painel/postar` | Comprador logado | Form completo | — |
| `app.girob2b.com.br/painel/necessidades` | Comprador logado | Lista próprias | — |
| `app.girob2b.com.br/painel/leads` | Vendedor aprovado | Feed | #6 |
| `app.girob2b.com.br/necessidade/[slug]` | Público (SSR + JSON-LD) | Detalhe pra SEO | #4 |
| `app.girob2b.com.br/buscar` | Vendedor aprovado | Busca filtrada | — |
| `app.girob2b.com.br/categoria/[slug]` | Vendedor aprovado | Feed por categoria | — |
| `app.girob2b.com.br/painel/perfil` | Autenticado | Dados empresa + RoleModeCard | #6 |
| `admin.girob2b.com.br/login` | Admin | Auth | — |
| `admin.girob2b.com.br/waitlist` | Admin | Fila de aprovação | — |
| `admin.girob2b.com.br/necessidades` | Admin | Moderação | — |
| `admin.girob2b.com.br/dashboard` | Admin | Métricas | — |

---

## 6. Telemetria mínima (V1 logs estruturados; V2 tabela `analytics_events`)

| Fluxo | Event | Onde dispara |
|---|---|---|
| P1, P2, P5 | `waitlist_submit_attempt` | submitSupplier inicia |
| P1, P5 | `waitlist_submit_success` | created |
| P2, P10 | `waitlist_submit_duplicate` | 23505 |
| P3 | `signup_started` | `?auth=register` abre modal |
| P3 | `signup_completed` | email confirmado |
| P3 | `signup_skipped_to_guest` | "Continuar sem cadastro" |
| P1 | `guest_publish_started` | submit do quick form |
| P1 | `guest_publish_completed` | demand criada com `guest_email` |
| P4 | `login_started` | submit do login form |
| P4 | `login_skip_clicked` | "Continuar sem login" |
| P7 | `waitlist_check_attempt` | POST /api/waitlist/check |
| P7 | `waitlist_check_approved` | status=approved retornado |
| P7 | `waitlist_check_pending` | status=pending |
| P7 | `waitlist_check_not_found` | status=not_found |
| P7 | `supplier_signup_completed` | createSupplierFromApprovedWaitlist OK |
| P3, P7 | `tutorial_started` | TutorialRunner mount |
| P3, P7 | `tutorial_completed` | last step → "Bora começar" |
| P3, P7 | `tutorial_skipped` | X / ESC / close button |
| P8 | `lead_contact_clicked` | botão WhatsApp |
| P8 | `lead_contact_completed` | RPC register_demand_contact OK |
| P6 | `admin_approve_supplier` | admin aprova |
| P6 | `admin_activate_trial` | trial 7d |
| P6 | `admin_suspend_supplier` | suspender |
| P9 | `paywall_shown` | trial expirado modal |

---

## 7. Decisões trancadas (não mexer sem PR de justificativa)

1. **Reverse marketplace** — vitrine = necessidades, não produtos (PIVOT 2026-05-07)
2. **WhatsApp único canal** — sem chat interno (PIVOT)
3. **Vendedor gateado por admin** — sem auto-signup (decisão 2026-05-14, refinado 2026-05-24)
4. **Modo binário** — sem "both" (decisão 2026-05-24)
5. **Tutorial primeiro-login com skip sempre** (decisão 2026-05-24)
6. **"Sou vendedor" só na raiz da app interna** (decisão 2026-05-24)
7. **Approval token 15min uso único** (decisão técnica 2026-05-24, PR #9)
8. **Sem dependência de Resend pra signup do vendedor** — validação síncrona (decisão 2026-05-24)

---

## 8. Decisões abertas (precisam ser trancadas pré-go-live)

1. **Preço da assinatura do vendedor** — landing mostra Start R$89 / Pro R$349
2. **Gateway de pagamento** — Stripe vs MP (rec: MP — PIX nativo)
3. **Filtro geográfico do feed** — default vê tudo; granularidade futura
4. **Revisão jurídica LGPD** — `demand-publish-v1-2026-05-07` sem revisão
5. **Rotação Supabase Management Token** — pré-go-live
6. **Resend ligado pra emails reais** — hoje fake; T1-17 em AVISOS
7. **V2: automação aprovação supplier** — Resend automatizado quando admin clica Aprovar

---

## 9. Tabela de cobertura — fluxo × tela × component × PR

| Fluxo | Telas | Components | Status |
|---|---|---|---|
| **P1** Buyer novo | landing /, /postar, /cadastro modal, /painel | WaitlistModal, WaitlistResultModal, BuyerRegisterForm, GuestDemandForm, QuickPublishForm | ✅ implementado (PRs #5, #4) |
| **P2** Buyer recorrente | landing /, /login | WaitlistModal, WaitlistResultModal, LoginForm | ✅ implementado |
| **P3** Buyer criando conta | /postar modal, /painel | AuthDialog, TutorialRunner | ✅ implementado (PR #8) |
| **P4** Buyer logado recorrente | /painel/necessidades, /painel/postar | DashboardShell (PR #6) | ✅ implementado |
| **P5** Supplier novo | landing /, sem retorno | WaitlistModal, WaitlistResultModal, SupplierWaitlistForm | ✅ implementado |
| **P6** Admin aprova | admin/waitlist | DataTable, ações | ✅ implementado |
| **P7** Supplier aprovado 1º acesso | /seja-vendedor, /cadastro/vendedor, /painel/leads | AlreadyApprovedCard, SupplierSignupForm, DashboardShell, TutorialRunner | ✅ implementado (PR #9, #8) |
| **P8** Supplier ativo | /painel/leads | DemandCard, SupplierSearchBar (PR #6), gates | ✅ implementado |
| **P9** Supplier expirado | /painel/leads preview, paywall | Paywall modal | 🟡 V1: bloqueia botão; V2: modal completo |
| **P10** Supplier recorrente edge | /cadastro/vendedor | InvalidToken | ✅ tratado server-side |

---

## 10. Estado atual de implementação (snapshot 2026-05-24)

### Banco (Supabase)

- ✅ Migration **044** aplicada — "both" removido + CHECK constraints `buyer|supplier`
- ✅ Migration **045** aplicada — colunas `approval_token`, `approval_token_expires_at`, `approval_token_used_at` em `waitlist` + index parcial

### PRs abertos (7) — aguardando merge

| # | Branch | O que entra |
|---|---|---|
| 3 | `fix/header-postar-context` | Header `/postar`: Publicar→Criar conta |
| 4 | `hotfix/necessidade-slug-null-description` | TypeError do `/necessidade/[slug]` sem description |
| 5 | `fix/home-postar-ux-pack` | UX audit findings H-1..H-4 + bonus |
| 6 | `feat/header-by-role-remove-both` | Header autenticado por role + remove "both" |
| 7 | `feat/header-sou-vendedor-raiz` | "Sou vendedor" no header da raiz |
| 8 | `feat/tutorial-primeiro-login` | Tutorial 3 passos driver.js |
| 9 | `feat/seja-vendedor-approval-gate` | Gate de cadastro vendedor + `/cadastro/vendedor` |
| 10 | `docs/casos-de-uso-v2` | **Este doc** |

### Bloqueador único

**GitHub Actions secrets** ainda não configurados. Os 7 PRs com CI ficam vermelhos. Configurar no Settings → Secrets and variables → Actions:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Após configurar, todos os 7 ficam verdes pra merge.

---

## 11. Components que os fluxos exigem (input pro DS)

> Esta seção é a entrada direta pra Fase 3 do DS (galeria de primitivos + patterns).

### Primitives (em `apps/web/components/ui/`)
- `Button` (variants: primary, secondary, accent, ghost, outline, danger; sizes: compact, default, comfortable)
- `Input`, `Label`, `Textarea`, `Select`, `Checkbox`
- `Card` (base, hover)
- `Dialog`, `DialogHeader`, `DialogTitle`, `DialogDescription`
- `Badge`, `ResoldBadge`
- `Avatar`
- `Tabs`, `Separator`
- `Skeleton`, `PageSkeleton`
- `Progress`
- `Sonner` (toaster)
- `GiroLoader`, `GiroLogo`

### Compostos
- `WaitlistModal` + `WaitlistResultModal` (landing)
- `AuthDialog` (web — login/register modal)
- `SupplierWaitlistModal` (web — `?waitlist=supplier`)
- `AlreadyApprovedCard` (PR #9 — `/seja-vendedor`)
- `QuickPublishForm` (home)
- `DemandCard` (feed)
- `DemandForm` / `GuestDemandForm`
- `BuyerRegisterForm` (com skip embedded)
- `LoginForm` (com prefill + skip embedded)
- `SupplierWaitlistForm`
- `SupplierSignupForm` (PR #9 — pós-aprovação)
- `RoleModeCard` (PR #6 — modo binário)
- `TutorialRunner` (PR #8 — driver.js wrapper)

### Patterns
- `PageHeader`, `EmptyState`, `FormSection`
- `DataTable` (admin)
- `Topbar` por persona (guest / buyer / supplier / admin) — todos no `dashboard-shell.tsx`
- `SupplierSearchBar` (PR #6 — item dominante do header supplier)

### Alerts (já em globals.css)
- `.alert-success`, `.alert-warning`, `.alert-error`, `.alert-info`

### Tutorial (PR #8)
- `.girob2b-tutorial.driver-popover` + override completo de cores GiroB2B

---

## 12. Próximos passos

### Imediato (destravar)
- [ ] Configurar 3 GitHub Actions secrets (Vitor, ~5min no Settings)
- [ ] Mergear PRs na ordem sugerida: #4 → #3 → #5 → #6 → #7 → #9 → #8 → #10

### Curto prazo (pós-merge)
- [ ] Smoke test E2E dos 10 fluxos (Playwright suite, ainda não escrita)
- [ ] Atualizar `AVISOS.md` removendo decisões trancadas pela v2 deste doc
- [ ] Atualizar `decision_*` memories em `~/.claude/projects/.../memory/`

### Médio prazo
- [ ] V1.1 Paywall completo (P9) com modal próprio
- [ ] V2 Automação Resend pra aprovar supplier (P6 → P7 sem fricção manual)
- [ ] V2 Gateway de pagamento (P8 → P9 renovação)
- [ ] V2 Self-service LGPD revogação
- [ ] V2 Filtro geográfico do feed

### Backlog técnico
- [ ] Sitemap.xml + robots.txt (RF-05.06)
- [ ] JSON-LD em /necessidade/[slug] com items[]
- [ ] CSP + HSTS no next.config.ts
- [ ] Smoke tests Fase 2 (migração Fastify→Next)
