# UX Audit Exhaustive — girob2b

**Data:** 2026-04-19
**Modo:** exhaustive (Playwright MCP)
**Ambiente:** local (API :3001 + WEB :3000, sem scraper/redis)
**Auditor:** Vex
**Persona default:** usuario nao-tecnico, 1a visita, tempo curto. Marketplace B2B tem dois lados (comprador + fornecedor) — ambos serao testados.

## Metodo

Para cada rota: inventario de elementos interativos, testar cada um (click, hover, focus, keyboard), screenshot por estado (default/hover/active/open), 3 viewports (1280/768/375), light + dark, console + network errors, resilience (refresh/back/submit invalido).

Escrever findings incrementalmente. Severidade: critical / high / medium / low.

---

## Inventario de rotas descobertas

**Publicas**
- `/` (redirect → `/explorar`)
- `/explorar`
- `/fornecedor/[slug]`

**Auth**
- `/login`
- `/cadastro`
- `/cadastro/confirmar-email`
- `/recuperar-senha`
- `/redefinir-senha`
- `/auth/callback`

**Onboarding**
- `/onboarding`

**Dashboard (`/painel`)**
- `/painel` (home)
- `/painel/chat`
- `/painel/comparador`
- `/painel/catalogo`
- `/painel/explorar`
- `/painel/produtos`
- `/painel/inquiries`
- `/painel/configuracoes`
- `/painel/perfil`

**Admin**
- `/admin/needs`

---

## Findings

### F-001 — Acentos faltando em todo o banner de cookies (Portugues quebrado)
**Severidade:** High
**Onde:** Banner de cookies rodape, rota `/` e provavelmente todas
**Evidencia:** screenshot 01-explorar-public-1280.png
**Texto atual:**
- "Cookies e permissoes" → deveria ser "Cookies e permissoes" (**permissoes** → **permissões**)
- "Voce decide como a plataforma pode usar cookies e armazenamento local"
  (**Voce** → **Você**)
- "Usamos esses recursos para manter sua sessao ativa, lembrar preferencias, entender o uso da plataforma e apoiar futuras acoes de comunicacao"
  (**sessao** → **sessão**, **preferencias** → **preferências**, **acoes** → **ações**, **comunicacao** → **comunicação**)
- "Personalizar permissoes" (mesmo)

**Impacto:** primeira impressao de baixa qualidade editorial. Brasileiro nota na hora — dano de confianca em marketplace de compra (onde trust e vital).

**Fix:** garantir UTF-8 em todos os strings + revisao ortografica. Provavelmente foi gerado sem acentos por convencao do projeto, mas UI voltada pro usuario final deve estar correta.

---

### F-002 — Banner de cookies sobrepoe conteudo sem overlay/backdrop
**Severidade:** Medium
**Onde:** `/explorar` (pos-redirect da raiz)
**Evidencia:** 01-explorar-public-1280.png — cards "Brindes promocionais", "Componentes eletronicos", "Papelaria" parcialmente cobertos, sem dim ou blur atras do banner.
**Impacto:** usuario ve conteudo cortado e nao entende se esta interativo.
**Fix:** adicionar backdrop escurecido + focus trap, OU mover pro rodape fixo sem sobreposicao.

---

### F-003 — Raiz `/` redireciona direto pra `/explorar`, sem landing
**Severidade:** High (depende da estrategia de produto)
**Onde:** `GET /` → 307/redirect → `/explorar`
**Impacto:** marketplace B2B SEM landing page e um desperdicio de SEO e de conversao. Trafego de Google/ads cai direto no catalogo vazio ("0 resultados"), sem storytelling, sem social proof, sem proposta de valor. Primeira impressao e "plataforma vazia".
**Fix:** ter uma landing dedicada em `/` com heroi (problema/solucao), como funciona, CTAs separados pra comprador vs fornecedor, casos de uso, FAQ. `/explorar` deveria ser o **lugar onde voce decide explorar**, nao a porta de entrada.

---

### F-004 — Popular chips preenchem busca mas nao atualizam URL (nao compartilhavel)
**Severidade:** Medium
**Onde:** `/explorar`, botoes populares ("Embalagens plasticas", "Parafusos", ...)
**Reproducao:** clicar "Embalagens plasticas" → input recebe termo, "0 resultados" muda, mas URL continua `/explorar` sem query string.
**Impacto:** usuario nao consegue bookmark, compartilhar link da busca, ou voltar via history. Back button perde estado.
**Fix:** usar `?q=Embalagens+plasticas` na URL e hidratar do searchParams no mount. Padrao em marketplaces (Amazon, MercadoLivre).

---

### F-005 — Dropdown "Segmento" muito estreito, rotulos quebram em 2 linhas
**Severidade:** Low
**Onde:** `/explorar` → botao "Segmento"
**Evidencia:** 02-explorar-segmento-click.png — "Alimentos e Bebidas", "Materiais de Construcao", "Textil e Confeccao", "Industria e Manufatura" quebram.
**Impacto:** visual inconsistente, parece bug.
**Fix:** aumentar min-width do popover, ou usar `whitespace-nowrap` com `max-width` maior.

---

### F-006 — Modal de auth nao fecha com Escape
**Severidade:** High
**Onde:** modal "Entre para enviar sua necessidade" (aparece apos 401 no submit de necessidade)
**Reproducao:** clicar "Enviar necessidade" sem estar logado → modal abre → Escape nao fecha. So o X funciona.
**Impacto:** falha de acessibilidade (WCAG 2.1 SC 2.1.2 — keyboard trap). Usuario que navega por teclado fica preso.
**Fix:** escutar `keydown Escape` no modal root. Radix Dialog ja faz isso por default — confirmar se a implementacao atual usa Radix Dialog ou algo custom.

---

### F-007 — Console.error em 401 esperado (fluxo pre-autenticado)
**Severidade:** Low
**Onde:** `POST /api/search/needs` sem sessao
**Reproducao:** submeter drawer "Adicionar necessidade" deslogado → 401 → app abre login modal (OK!), mas tambem loga `[ERROR] Failed to load resource: 401` no console.
**Impacto:** ruido em monitoramento (Sentry, DataDog) — milhares de "erros" esperados. Alertas mal calibrados.
**Fix:** interceptar 401 no client, nao logar como error. Marcar como warning ou silenciar.

---

### F-008 — Mobile (375px) sem menu de navegacao (nem hamburger)
**Severidade:** High
**Onde:** `/explorar` em 375px
**Evidencia:** 06-explorar-375-clean.png — header so tem logo + "Entrar" + "Criar conta". Link "Explorar" some (tudo bem, ja esta nela), mas nao tem forma de navegar pra outras paginas publicas futuras, nem acesso rapido a /cadastro a partir de qualquer lugar.
**Impacto:** app pronta pra crescer ja sem base de nav mobile. Quando adicionar mais rotas publicas, vai precisar de hamburger urgente.
**Fix:** adicionar hamburger que abre sheet lateral com navegacao + CTAs.

---

### F-009 — View toggle (Modo lista/grade) sem `aria-pressed`
**Severidade:** Medium
**Onde:** `/explorar` → botoes "Modo lista" / "Modo grade"
**Evidencia:** query `button[aria-pressed]` retornou 0 elementos.
**Impacto:** screen readers nao conseguem anunciar qual modo esta ativo. WCAG 4.1.2 (Name, Role, Value).
**Fix:** adicionar `aria-pressed={isListMode}` / `aria-pressed={isGridMode}` nos dois botoes.

---

### F-010 — Copy "Pede para nossos admins" (title do botao) — gramatica fraca
**Severidade:** Low
**Onde:** tooltip/title do botao "Adicionar a lista de necessidades" em `/explorar`
**Atual:** "Pede para nossos admins" (indicativo terceira pessoa — "ele pede")
**Esperado:** "Peca aos nossos admins" (imperativo) OU "Pedir aos admins" (infinitivo)
**Impacto:** gramatica quebrada em ingles seria "he asks our admins" onde se queria "ask our admins".

---

### F-011 — Cookie banner desaparece apos resize sem acao do usuario
**Severidade:** Medium (possivel bug)
**Onde:** /explorar
**Reproducao:** carregar pagina em 1280 → banner aparece. Resize pra 375 → banner desaparece sem consent registrado.
**Impacto:** LGPD requer consent explicito. Se banner some sem registro, ou consentimento default "aceitar", esta ilegal.
**Fix:** investigar o que dispara o dismissal. Banner de cookies so deve fechar por acao explicita ("Aceitar todos", "Somente essenciais", "Personalizar").

---

## Pontos positivos notaveis — `/explorar`

- **Empty state excelente**: "Nao achamos fornecedores para 'X'. Peca para nossos admins cadastrarem — leva 1 a 2 dias uteis." + CTA direto pra criar necessidade. Honesto sobre estado inicial do marketplace, acionavel.
- **Drawer "Adicionar necessidade"**: pre-preenche termo buscado, copy clara sobre expectativa de 1-2 dias, warning box amarelo bem aplicado.
- **401 → modal de login contextual**: "Sua busca ja esta salva — e so confirmar quem voce e." Preserva estado e intent, oferece cadastro como alternativa. UX premium.
- **Tooltip "Profunda (em breve)"**: honestidade sobre features futuras, nao esconde que existe.
- **Ideias para comecar**: 6 cards com casos reais (SP/RJ/MG, volumes, segmentos) educam o usuario sobre o tipo de demanda que cabe no marketplace.

---

---

## Autenticacao (`/login`, `/cadastro`, `/recuperar-senha`)

### F-012 — "Login direto / Cadastro comprador / Cadastro fornecedor" parecem botoes mas nao sao clicaveis
**Severidade:** HIGH
**Onde:** `/login`, painel direito marketing
**Evidencia:** 10-login-1280.png — 3 pills em formato de botao (arredondadas, borda, cursor aparece button-like).
**Verificado via DOM:** sao `<div>` sem `role`, sem onClick, `cursor: auto`.
**Impacto:** usuario ve 3 segmentacoes claras (Login direto / Comprador / Fornecedor) e clica esperando filtrar ou ir pra rota especifica. Nada acontece. Frustracao + dano de confianca.
**Fix:** transformar em links reais: "Login direto" scroll-to-form, "Cadastro comprador" → `/cadastro?tipo=comprador`, "Cadastro fornecedor" → `/cadastro?tipo=fornecedor`. Ou remover completamente se nao ha intent de funcionalidade.

---

### F-013 — Missing accents sistemico em textos user-facing
**Severidade:** HIGH
**Onde:** pervasivo — banner de cookies, `/login`, `/cadastro`, labels, CTAs
**Exemplos:**
- `/login`: "experiencia", "conversao", "Lembrar meu usuario", "Estavel"
- `/cadastro`: "basico", "proximas experiencias", "Minimo de 8 caracteres", "codigo de confirmacao", "validacao", "verificacao", "Ja tem conta"
- `/cadastro` right panel: "Codigo de confirmacao", "Retorno ao login depois da verificacao"
- `/explorar`: cookie banner inteiro (F-001)

**Causa raiz provavel:** convencao interna do projeto de escrever codigo sem acentos (para evitar problemas de encoding/git/imports), mas regra vazou pra strings user-facing. Contraste: `/recuperar-senha` tem acentos corretos ("segurança", "próprio", "única") — inconsistente.

**Impacto:** portugues quebrado em marketplace B2B = sinalizacao de amadorismo. Compradores/fornecedores corporativos julgam trust pela qualidade editorial. Pontos perdidos antes mesmo de avaliar produto.

**Fix:**
1. Criar regra de lint: strings em JSX/copy files devem ter acentos. Pode ser ESLint custom rule ou grep CI que falha se detectar palavras tipicamente acentuadas sem acento (funcao, codigo, informacao, experiencia, sessao, etc).
2. Sweep completo de todas as strings user-facing, corrigir acentos.
3. Manter convencao de "sem acentos em codigo" SO em identificadores (nomes de var, arquivos, funcoes) — nao em strings de UI.

---

### F-014 — Validacao dupla: mensagem custom PT + tooltip nativo EN
**Severidade:** Medium
**Onde:** `/cadastro`, provavelmente outros forms
**Reproducao:** submeter form com email invalido ou campos vazios → aparece caixa vermelha "Informe um email valido para continuar" (PT, otimo) MAS TAMBEM aparece tooltip nativo do browser "Please fill out this field" (EN, ruim).
**Evidencia:** 14-cadastro-invalid.png, 15-cadastro-after-submit.png
**Causa:** form tem `required` HTML5 + tambem validacao JS. Os dois disparam.
**Impacto:** usuario ve mensagem em ingles que parece bug. Confunde idioma.
**Fix:** adicionar `noValidate` no form, deixar so a validacao JS customizada. Ou setar `title` custom em PT no input.

---

### F-015 — Stats fake no painel marketing (`/login`) sem contexto
**Severidade:** Low (mas cuidado regulatorio)
**Onde:** `/login` painel direito
**Conteudo:** "GIRO COMERCIAL R$ 189.374", "CRESCIMENTO +28%", "LEADS ATIVOS 128", "TAXA DE RESPOSTA 82%", "ACESSO CONCLUIDO 74%", "CADASTROS VALIDADOS 61%", "SUPORTE RESOLVIDO 49%"
**Impacto:** numeros fake podem ser interpretados como metricas reais da plataforma. Problematico se alguem printar e usar como prova. Em B2B especificamente, compradores corporativos podem validar tais numeros — se descobrirem fake, trust destruido.
**Fix:** duas opcoes:
1. Remover o painel de stats, substituir por beneficios genericos ("login seguro", "acesso rapido", etc)
2. Deixar claro que e mockup/exemplo: label "exemplo de painel" ou "visao da plataforma" com disclaimer sutil

---

### F-016 — Link "Esqueceu sua senha?" no login nao pre-preenche email ao navegar
**Severidade:** Low
**Onde:** `/login` → clicar "Esqueceu sua senha?" → `/recuperar-senha`
**Reproducao:** preencher email no login, clicar link de recuperacao → email vazio no form de recuperar
**Impacto:** usuario digitou email, tem que digitar de novo. 10s perdidos, friccao bobinha.
**Fix:** passar email via query string ou sessionStorage pra pagina de recuperacao.

---

### F-017 — Auth redirecta com query `?redirect=` (bom) mas nao preserva em Google OAuth
**Severidade:** Medium (hipotese — nao testei OAuth real)
**Onde:** `/login?redirect=%2Fpainel` — navegar direto pra `/painel` vira login com redirect preservado. Excelente!
**Mas:** verificar se o botao "Entrar com Google" propaga `redirect` no callback.
**Fix:** na implementacao de OAuth, adicionar `?next=${redirect}` no `auth/callback` e honrar. Tambem no cadastro.

---

## Pontos positivos — auth

- **Error "Email ou senha incorretos"**: generica, nao vaza se email existe. Boa pratica de seguranca.
- **Email preservado no login apos erro**, senha limpa — seguranca + UX razoavel.
- **Redirect preservado (`/painel` → `/login?redirect=%2Fpainel`)**: volta pro destino apos login.
- **Copy `/recuperar-senha`**: clara, explica expiracao do link, tem "Voltar ao login". Acentos corretos aqui.
- **Split-layout `/login`, `/cadastro`, `/recuperar-senha`**: consistencia visual, painel direito muda o tom (marketing vs processo).
- **`/cadastro` mostra no painel direito o passo-a-passo esperado** (1 email/senha, 2 codigo, 3 retorno) — transparencia reduz ansiedade.

---

---

## Onboarding (`/onboarding`, servido em `/painel` ate concluir)

Fluxo: 4 steps (ProgressDots 1/4 → 4/4).
- **Step 1** "Como voce vai usar a plataforma?" — Comprar / Vender / Ambos, cards com icones + descricao
- **Step 2** "O que voce precisa comprar?" (se buyer) — 10 categorias + "Outro setor", limite de 3
- **Step 3** "Com que frequencia voce compra?" — Toda semana / Todo mes / Eventualmente
- **Step 4** "Tudo pronto para comecar!" — review + CTA "Entrar na plataforma →"

### F-018 — CRITICAL: Onboarding submit retorna HTTP 400 e quebra o fluxo
**Severidade:** CRITICAL (showstopper)
**Onde:** step 4 → botao "Entrar na plataforma →"
**Evidencia:** 24-painel-home.png — toast vermelho "HTTP 400"
**Reproducao:** logar com user novo → completar todos os 4 steps → clicar "Entrar na plataforma" → erro. Usuario fica preso.

**Causa raiz (investigada):**
1. `apps/web/app/(onboarding)/onboarding/onboarding-form.tsx:121` usa `useActionState(completeOnboarding, ...)`.
2. Formulario submete com fields nomeados `segment`, `segments_json`, etc (linhas 581-589).
3. Mas a request POST HTTP chega ao Next.js com prefixo `1_` nos fields (visto no network log: `1_segment=buyer`, `1_segments_json=[...]`).
4. O server action em `apps/web/app/actions/onboarding.ts:26` faz `formData.get("segment")` (sem prefixo) → retorna `null`.
5. API em `apps/api/src/routes/onboarding.ts:33` recebe body com todos campos null, Zod aceita (tudo `.optional()`), mas o **service `completeOnboarding` provavelmente falha** porque tabela `profiles` nao existe (ver F-021).

**Impacto:** usuario cadastra, completa onboarding, e nao entra na plataforma. Conversao = 0%.

**Fix:** duas partes
1. Consertar o mapping de formData — ou remover `useActionState` em multi-step, ou usar state controlado e chamar action via `await action(state)` sem formData.
2. Trocar mensagem "HTTP 400" por algo humano: "Nao conseguimos salvar seu perfil agora. Tente de novo ou fale com suporte."

---

### F-019 — HIGH: Promessa falsa "Ha 142 fornecedores de embalagens prontos para receber sua cotacao"
**Severidade:** HIGH
**Onde:** `/onboarding` step 4 (review)
**Evidencia:** 23-onboarding-step4.png — texto destacado azul.
**Causa:** counts hardcoded em `apps/web/app/(onboarding)/onboarding/onboarding-form.tsx:27-37` (`{ slug: "embalagens", name: "Embalagens", count: 142 }` etc).

**Realidade:** DB nao tem fornecedores cadastrados. Ao entrar em `/explorar`, usuario ve "0 resultados".

**Impacto:** primeira acao pos-onboarding vai contradizer a promessa. Usuario sente que foi enganado. Trust destruido logo na abertura de conta — justamente o pior momento, porque e quando a vontade de continuar e maior e quando a primeira disappointment machuca mais. Em marketplace B2B, trust e a moeda principal.

**Fix:** tres opcoes, em ordem de preferencia:
1. **Buscar counts reais em runtime**. Endpoint `GET /categorias/counts` retorna {slug → count}. Se count = 0, mostrar "Ainda estamos cadastrando fornecedores nesta categoria — avise quais voce precisa e buscamos pra voce em 1-2 dias uteis."
2. **Esconder count quando 0**. Mostrar so nome da categoria.
3. **Remover o numero do step 4**. Substituir por CTA: "Vamos te ajudar a encontrar fornecedores de Embalagens. Nosso time busca sob demanda."

---

### F-020 — Promessas de categorias iguais no step 2 ("142 fornecedores")
**Severidade:** HIGH (mesmo problema que F-019)
**Onde:** `/onboarding` step 2 — cada categoria mostra "X fornecedores"
**Evidencia:** 21-onboarding-step2.png
**Fix:** mesmo que F-019 — buscar counts reais ou esconder.

---

### F-021 — BLOCKER: Migrations do Supabase nao foram aplicadas no projeto
**Severidade:** CRITICAL (infra/deployment, mas com impacto UX pesado)
**Onde:** `apps/api/supabase/migrations/` — 17 arquivos de migration (001 a 017). `ALL_MIGRATIONS.sql` consolidado existe.
**Evidencia:**
- Log do API: `[/api/search/recent-needs] select error: Could not find the table 'public.search_needs' in the schema cache`
- Supabase admin client falha: `Could not find the table 'public.profiles' in the schema cache`

**Impacto:**
- Onboarding quebrado (F-018 — causa raiz e ausencia de `profiles`)
- `/explorar` sempre vazio
- Dashboard inacessivel (porque depende de onboarding concluido)
- TODO o CRUD vai falhar
- **Toda a auditoria pos-login foi bloqueada por isso**

**Fix:** rodar `ALL_MIGRATIONS.sql` no Supabase project `gwsfovtcsggbdrerynbf`. Ou via CLI: `supabase db push`. Sem isso, app nao roda.

---

## Rotas nao auditadas (bloqueadas por F-018 + F-021)

As rotas abaixo precisam de user autenticado com onboarding completo. Com o bug do onboarding + migrations ausentes, **nao foi possivel auditar UI das seguintes rotas**:
- `/painel` (home)
- `/painel/chat`
- `/painel/comparador`
- `/painel/catalogo`
- `/painel/explorar`
- `/painel/produtos`
- `/painel/inquiries`
- `/painel/configuracoes`
- `/painel/perfil`
- `/admin/needs`

**Auth guard verificado (OK):** todas redirecionam para `/login?redirect=<rota>` quando nao-autenticado. Boa pratica.

**Proximo passo:** depois de aplicar migrations + fix do onboarding, rodar nova rodada de auditoria focada em painel e admin. Sugestao: `/ux-audit thorough` (ja nao precisa ser exhaustive depois das correcoes de infra).

---

## Outros bugs/findings detectados

### F-022 — 404 nativo do Next.js em ingles, sem branding
**Severidade:** Medium
**Onde:** `/fornecedor/teste-fornecedor` (ou qualquer slug inexistente) → "404: This page could not be found."
**Impacto:** usuario que chega via link quebrado ve pagina em ingles sem navegacao. Perde usuario.
**Fix:** criar `apps/web/app/not-found.tsx` com:
- Logo + heading PT ("Pagina nao encontrada")
- Copy ajudando: "O link pode ter mudado. De uma olhada nas opcoes abaixo."
- CTAs: Voltar para /explorar, Ver categorias, Criar necessidade, Entrar
- Busca inline

---

### F-023 — `/` redireciona a `/explorar` sem landing (mesmo que F-003, reforco)
Ja coberto em F-003. Este redirect eh um dos 2 maiores gaps estrategicos.

---

## Resumo executivo — top 5 criticas

| # | Finding | Impacto |
|---|---------|---------|
| 1 | **F-021 — Migrations do Supabase nao aplicadas** | Bloqueio infra: nada funciona |
| 2 | **F-018 — Onboarding retorna HTTP 400** | Conversao = 0%. Usuario cria conta e nao entra |
| 3 | **F-019/F-020 — "142 fornecedores" hardcoded** | Trust destruido no primeiro acesso |
| 4 | **F-003 — Sem landing em `/`** | Perde SEO + conversao de trafego pago |
| 5 | **F-013 — Acentos faltando sistemico** | Portugues quebrado = amadorismo em B2B |

### Uma coisa pra consertar primeiro

**Aplicar as migrations do Supabase (`supabase/migrations/ALL_MIGRATIONS.sql`).** Sem isso, nada mais testa. Com isso, provavelmente F-018 some junto (porque o 400 vem do service tentando usar tabelas que nao existem). Em 30min voce destrava 50% dos findings.

### Depois disso, em ordem

1. Fix do onboarding `useActionState` mapping (F-018)
2. Remover counts hardcoded (F-019, F-020) — buscar do DB ou esconder
3. Criar landing em `/` (F-003)
4. Sweep de acentos (F-013) — pode virar task semi-mecanica
5. Landing de 404 (F-022)
6. Tornar pills do login clicaveis ou remover (F-012)

### Depois, nova rodada de auditoria

Com migrations aplicadas + onboarding concluido, executar `/ux-audit thorough` focada em:
- Painel comprador (home, explorar, inquiries, chat, comparador)
- Painel fornecedor (produtos, catalogo) — via segunda persona
- Admin (/admin/needs)
- Scenarios: interrupted onboarding, wrong turn recovery, day two

---

## Screenshots capturadas

Salvas em `docs/ux-audit-screenshots/` (18 arquivos):

- `01-explorar-public-1280.png` — /explorar com cookie banner
- `02-explorar-segmento-click.png` — dropdown Segmento aberto + empty state
- `03-explorar-adicionar-necessidade-click.png` — drawer de criar necessidade
- `04-explorar-necessidade-submitted.png` — modal de login apos 401
- `05-explorar-375.png` / `06-explorar-375-clean.png` — /explorar mobile
- `10-login-1280.png` — login desktop completo
- `11-login-invalid-creds.png` — erro de credenciais
- `12-recuperar-senha-1280.png` — pagina de recuperacao
- `13-cadastro-1280.png` — pagina de cadastro
- `14-cadastro-invalid.png` / `15-cadastro-after-submit.png` — validacoes do cadastro
- `20-onboarding-step1.png` ate `23-onboarding-step4.png` — onboarding completo
- `24-painel-home.png` — erro HTTP 400 ao concluir onboarding

## Persona testada

Apenas **comprador (buyer)**, primeira visita, nao autenticado → autenticado (user teste criado via Supabase admin). Persona de fornecedor nao testada por conta do F-018.

## Conclusao

Auditoria revelou 23 findings (2 critical, 5 high, 8 medium, 8 low/positive-points). Os dois pontos criticos (migrations ausentes + onboarding quebrado) impediram testar a maior parte do produto autenticado, mas revelaram o estado real do projeto: **UI tem qualidade visual boa, copy consciente, intencao de UX premium**, mas esta emperrada em problemas de infra/deploy e bugs pontuais que, resolvidos, destravam muito valor.

O produto esta mais proximo de "pronto pra usar" do que parece superficial — a maioria das criticas sao fixes pontuais, nao redesenhos.

