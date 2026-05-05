# MVP_SCOPE — GiroB2B

> **Documento operacional.** Define o que entra no primeiro lancamento e o que fica pra fase 2+.
> Criado em 14/04/2026. **Reescrito 05/05/2026** — varredura completa contra 7 fontes canonicas.
>
> **Fontes verificadas nesta reescrita:**
> 1. Regras de Negocio (`1.6_REGRAS_DE_NEGOCIO.md`) — 32 regras MVP
> 2. Plano de Negocios v3 (`Plano_de_Negocios_GiroB2B_v3.md`) — §4 a §13 inteiros
> 3. Decisoes D3-D12 (`_PLANO_V3_GAPS_2026-05-02.md`) — 10 decisoes trancadas
> 4. Catalogo Multi-Setorial (`CATALOGO_MULTI_SETORIAL.md`) — §6 priorizacao
> 5. Handbook (`HANDBOOK_GIROB2B.md`) — §2.5/2.6
> 6. DNA_GIROB2B (`compartilhado/DNA_GIROB2B.md`)
> 7. Decisao direta do Gustavo 05/05/2026 (completude 100% pra conta paga)
>
> **Se um item nao tem fonte, nao entra.** Notas de trabalho em `_NOTAS_MVP_SCOPE_REWRITE.md`.

---

## AVISO PARA O VITOR E SEU CLAUDE CODE

**As features e regras deste documento afetam a documentacao tecnica inteira — nao apenas este doc.**

Alteracoes em requisitos cascateiam: novos RFs geram casos de uso, sequencias, ERD, dicionario, fluxogramas. Uma mudanca aqui pode afetar 5-10 docs em cadeia.

**Antes de implementar qualquer item novo:**
1. Varrer docs tecnicos em `sistema/documentacao_tecnica/` pra identificar cascata
2. Atualizar docs afetados ANTES de codar
3. **Avisar o Gustavo** sobre quais docs precisam atualizacao

---

## 1. Principio

O MVP valida **uma unica hipotese de negocio**: fornecedores B2B pagam para receber leads qualificados de compradores.

Tudo que nao contribui pra testar essa hipotese foi empurrado pra frente. A regra de decisao: *"Se eu remover isso e o fornecedor ainda conseguir receber um lead e o comprador ainda conseguir enviar uma cotacao, fica pra depois."*

(Fonte: Plano v3 §5.3)

## 2. Estrutura em Tiers

- **Tier 1 (must-have):** sem isso o marketplace nao funciona. Lancamento bloqueado se faltar.
- **Tier 2 (should-have):** aumenta credibilidade e conversao. Funciona sem, mas com tracao menor.
- **Tier 3 (nice / stretch):** ambicioso. Entra se velocidade permitir.
- **Fora do MVP:** explicitamente adiado. Requer rejustificativa.

---

## 3. Tier 1 — Must-have

### 3.1 Autenticacao e cadastro

**Features:**

| # | Feature | Fonte |
|---|---------|-------|
| 1 | Cadastro Nivel 1: email + senha (friccao minima). Dados adicionais coletados progressivamente via perfil/onboarding. | RF-01.01, §5.1 principio Simplicidade |
| 2 | Login email + senha | RF-01.09 |
| 3 | Recuperacao de senha via email | RF-01.10 |
| 4 | Confirmacao de email obrigatoria. Contas nao confirmadas em 7d excluidas automaticamente. | RF-01.05, RN-01.03 |
| 5 | Ativacao buyer no momento da 1a inquiry. Checkbox LGPD obrigatorio. CNPJ opcional (pra selo). | RF-01.06, RN-01.05, RN-01.06, RN-01.07 |
| 6 | Upgrade supplier com CNPJ obrigatorio (BrasilAPI). Apenas CNPJ ativo aceito. Fallback cadastro provisorio se API cair. | RF-01.13, RN-01.01 |

**Regras que as features acima devem respeitar:**

| Regra | Descricao | Fonte |
|-------|-----------|-------|
| R1 | Role derivado da existencia em `buyers`/`suppliers`, nao definido manualmente. | RN-01.10 |
| R2 | Dual-role: mesma conta pode ser buyer + supplier simultaneamente. Login e JWT unificados. | RN-01.11 |
| R3 | CNPJ unico por supplier. Tentativa com CNPJ existente → fluxo de reivindicacao. | RN-01.02 |
| R4 | CPF nunca coletado. Decisao explicita. | RN-01.13 |

### 3.2 Perfil do fornecedor e catalogo

**Features:**

| # | Feature | Fonte |
|---|---------|-------|
| 7 | Editar perfil supplier (descricao, telefone, site, endereco, fundacao, funcionarios-faixa, horario). | RF-02.01 |
| 8 | Upload de 1 logo (Supabase Storage, max 2MB, PNG/JPG/WebP). | RF-02.01 |
| 9 | CRUD de produtos (nome, descricao, categoria, 1 foto, unidade, faixa de preco, atributos dinamicos por categoria). | RF-03.01, D8/§5.5 |
| 10 | Categorizacao hierarquica 4 niveis (mega > categoria > sub > folha). Seed ~48 folhas. | D8, §5.5, CATALOGO §2 |
| 11 | Tabela de templates de atributos por categoria folha (chave, tipo, obrigatorio/opcional). Formulario dinamico renderizado do template. | D8, §5.5, CATALOGO §1.3 |
| 12 | Coluna `attributes` JSONB nullable em `products`. Index GIN. | D8, §5.5 |
| 13 | Coluna `variant_parent_id` UUID nullable em `products`. Schema-prepared pra variantes futuras — sem UI no MVP. | D8, §5.5 |
| 14 | 2 a 4 atributos exibidos inline no card de listagem (`show_on_card` por template). Pattern IndiaMART. | §5.5, CATALOGO §1.3 |
| 15 | Photo guidelines por categoria como recomendacao no formulario de upload. Nao bloqueia. | D11, §5.5 |
| 16 | Normalizacao basica de unidades — lista sugerida por categoria, backend normaliza variacoes. | CATALOGO §4 |
| 17 | Seed de templates de atributos pras ~48 categorias folha (migration ou seed script). | CATALOGO §3, §6.1 |
| 18 | Barra de completude do perfil (0-100%) com 9 campos ponderados. Exibida no painel do fornecedor. | RN-02.01 |
| 19 | Tags automaticas extraidas de nome, descricao e categoria do produto. Revisaveis pelo fornecedor. | RN-02.07, RF-03.05 |

**Regras que as features acima devem respeitar:**

| Regra | Descricao | Fonte |
|-------|-----------|-------|
| R5 | Completude 100% = boost +15% no score de ranking da busca. | RN-02.01 |
| R6 | Lembretes email perfil incompleto: 3d, 7d, 14d apos cadastro. Apos 30d sem 50%, lembrete mensal. | RN-02.02 |
| R7 | Listagem de produtos ilimitada e gratuita pra todos os tiers. Cada produto = pagina indexavel SEO. | RN-02.03 |
| R8 | Produtos sem categoria → "Outros" com menor prioridade na busca. | RN-02.04 |
| R9 | Produto pausado: oculto na busca, conta na completude. Excluido: soft delete 30d. | RN-02.05 |
| R10 | Faixa de preco opcional. Quando informada, exibida como range (ex: "R$10 a R$50/un"). | RN-02.06 |

**Pesos da completude (RN-02.01):**

| Campo | Peso |
|-------|------|
| Logo | 10% |
| Descricao ≥100 chars | 15% |
| Endereco (cidade+estado) | 10% |
| Telefone | 10% |
| 1+ categoria | 10% |
| 3+ produtos cadastrados | 20% |
| Foto em todos os produtos ativos | 15% |
| Horario de funcionamento | 5% |
| Ano de fundacao | 5% |

### 3.3 Busca e descoberta

**Features:**

| # | Feature | Fonte |
|---|---------|-------|
| 20 | Busca textual em produtos. PostgreSQL Full-Text Search (tsvector). | RF-04.01 |
| 21 | Filtros basicos (categoria, cidade, estado). Sem filtro preco no T1. | RF-04.02 |
| 22 | Navegacao por categorias (browse). Paginas listando produtos/fornecedores por categoria. | RF-04.04 |
| 23 | Pagina publica do produto (SSR + meta tags). URL: `/produto/[slug]`. | RF-05.01 |
| 24 | Pagina publica do fornecedor (SSR + meta tags). URL: `/fornecedor/[slug]`. | RF-02.05 |
| 25 | Algoritmo de ranking composto com 5 fatores ponderados (ver tabela abaixo). | RN-03.01 |

**Algoritmo de ranking de busca (RN-03.01):**

| Fator | Peso | Logica |
|-------|------|--------|
| Relevancia textual | 35% | Match termo buscado vs nome, tags, categoria, descricao |
| Nivel do plano | 25% | Enterprise 100pts, Premium 80, Pro 60, Starter 40, Gratuito 10. **No MVP: todos gratuitos (10pts), fator neutro.** |
| Completude do perfil | 15% | % de completude (RN-02.01) convertido em pontos. 100% = +15% boost adicional. |
| Proximidade geografica | 15% | Mesma cidade 100pts, mesmo estado 60pts, estado vizinho 30pts |
| Frescor do cadastro | 10% | Produtos cadastrados/atualizados recentemente: boost 30 dias |

**Regras que as features acima devem respeitar:**

| Regra | Descricao | Fonte |
|-------|-----------|-------|
| R11 | Dentro da mesma faixa de score (<5% diferenca), ordem randomizada pra fairness. | RN-03.02 |
| R12 | Zero resultados = (a) sugerir termos alternativos, (b) exibir categorias similares, (c) oferecer inquiry generica. Tela vazia e inaceitavel. | RN-03.04 |
| R13 | Paginas SEO automaticas so geradas com minimo 3 fornecedores. <3 = noindex automatico. | RN-03.05, RN-03.06 |

### 3.4 Fluxo de cotacao

**Features:**

| # | Feature | Fonte |
|---|---------|-------|
| 26 | Inquiry direcionada (comprador → fornecedor especifico). Formulario: descricao, quantidade, prazo, cidade/estado. | RF-06.01, RN-04.02 |
| 27 | Notificacao email da inquiry pro supplier (Resend). | RF-06.02 |
| 28 | Painel supplier: listar inquiries com status (nova/visualizada/respondida/arquivada/denunciada). | RF-06.03, RN-04.08 |
| 29 | Painel buyer: ver inquiries enviadas com status (enviada/visualizada). | RF-10.01 |
| 30 | Lead Manager basico no painel supplier (status enum, notas texto livre, data followup). | RF-09.05 additions v3 |
| 31 | Estrutura preparatoria de dados ocultos: UI mostra mensagem "assine pra ver contato" pro tier gratuito. Sem cobranca no MVP — todos veem dados completos — mas estrutura pronta. | RN-04.05, RF-06.04 nota |

**Regras que as features acima devem respeitar:**

| Regra | Descricao | Fonte |
|-------|-----------|-------|
| R14 | Rate limit 10 inquiries/dia por buyer. | RF-06.07, RN-04.01 |
| R15 | Deduplicacao 48h (mesmo buyer + supplier + produto). Fornecedor ve so a versao mais recente. | RN-04.04 |
| R16 | Status workflow da inquiry: Nova → Visualizada → Respondida \| Arquivada \| Denunciada. | RN-04.08 |

### 3.5 Protecao, moderacao e operacao

**Features:**

| # | Feature | Fonte |
|---|---------|-------|
| 32 | Admin dashboard com KPIs: fornecedores totais e ativos (atividade 30d), produtos listados, inquiries por periodo, completude media de perfil. | RF-12.01, §12.2 |
| 33 | Admin: suspender/reativar usuario (supplier ou buyer). | RF-12.02 |
| 34 | Admin: gerenciar arvore de categorias (CRUD). | RF-12.03 |
| 35 | Verificacao CNPJ automatica no cadastro supplier. Resultado "CNPJ verificado" no perfil. Revalidacao a cada 90 dias. | RN-07.06 nivel 1 |
| 36 | Filtro "Apenas Empresas Verificadas" no painel supplier (inquiries de buyers com CNPJ validado). Desativado por default. Aviso de reducao de volume ao ativar. | RN-01.12 |

**Regras que as features acima devem respeitar:**

| Regra | Descricao | Fonte |
|-------|-----------|-------|
| R17 | Produtos publicados imediatamente (sem fila de aprovacao). Moderacao reativa. | RN-07.01 |
| R18 | Produtos proibidos (falsificacoes, ilegais, conteudo adulto, armas) removidos imediato. 7d pra contestar. 3 violacoes = suspensao conta. | RN-07.03 |
| R19 | Denuncia de fornecedores por compradores. Admin analisa em 48h uteis. 3 confirmadas = advertencia, 5 = suspensao. | RN-07.05, RF-11.04 |

### 3.6 Notificacoes e comunicacao

**Features:**

| # | Feature | Fonte |
|---|---------|-------|
| 37 | Emails transacionais via Resend: confirmacao cadastro, nova inquiry recebida (supplier), inquiry visualizada (comprador), lembrete perfil incompleto (3d/7d/14d), lembrete inquiry nao visualizada (48h). | RN-09.01 |
| 38 | WhatsApp link basico no perfil do fornecedor (wa.me com mensagem pre-formatada referenciando produto/categoria). Sem API — link direto. | §6.3 tier gratuito |

**Regras:**

| Regra | Descricao | Fonte |
|-------|-----------|-------|
| R20 | Unsubscribe funcional em todo email transacional. Emails de inquiry e cobranca nao desativaveis. | RN-09.02 |

### 3.7 Schema de monetizacao (preparacao, sem cobranca no MVP)

**Features:**

| # | Feature | Fonte |
|---|---------|-------|
| 39 | Enum `plan_name` (gratuito/starter/pro/premium/enterprise) na tabela suppliers. Todos comecam gratuitos. | Additions v3, §4.2 |
| 40 | Coluna `leads_monthly_quota` com default 5 pro gratuito. Preparacao pra cobranca M12. | §4.1, §4.2 |
| 41 | Limite de 50 SKUs pra tier gratuito. Soft limit com CTA de upgrade ao atingir. | §4.1 |
| 42 | Upgrade pra plano pago exige perfil 100% completo (todos os 9 campos da RN-02.01 preenchidos). | Decisao Gustavo 05/05/2026 |

### 3.8 Analytics e dados

**Features:**

| # | Feature | Fonte |
|---|---------|-------|
| 43 | Log de todas as buscas: termo, filtros, localizacao, numero de resultados, cliques. Anonimizado. Ativo estrategico da empresa. | RN-10.01 |

**Total Tier 1: 43 features + 20 regras operacionais.**

---

## 4. Tier 2 — Should-have

Entra se sobrar tempo apos Tier 1. Aumenta conversao e credibilidade.

| # | Feature | Fonte |
|---|---------|-------|
| T2-1 | Selo "Empresa Verificada" pro BUYER (CNPJ validado via BrasilAPI). Selo no card e na inquiry. | RF-01.14, Plano v3 §5.3 |
| T2-2 | Barra de completude do BUYER (~40%→100% progressiva). | RF-01.16 |
| T2-3 | Upload multiplas fotos empresa (ate 5). | RF-02.03 |
| T2-4 | Dados estruturados Schema.org (Product + Organization JSON-LD). Rich snippets Google. | RF-05.08, §7.2 |
| T2-5 | Sitemap XML automatico + submissao GSC. | RF-05.06, §7.2 |
| T2-6 | Paginas SEO de categoria (`/categoria/[slug]`). SSR/ISR. | RF-05.02, §7.2 |
| T2-7 | Paginas SEO de localidade (`/fornecedores/[cidade]`). Hyper-local. | RF-05.03, §7.2 |
| T2-8 | Lembrete email perfil incompleto buyer (1 unico, aos 7 dias). | RF-13.01 |
| T2-9 | Admin: gerenciar categorias (CRUD avancado com merge e desativacao). | RF-12.03 |
| T2-10 | Login social Google. Supabase Auth nativo. | RF-01.11 |
| T2-11 | Product groups (fornecedor organiza produtos em pastas). Util acima de 200 SKUs. | D9, §5.5 |
| T2-12 | BuyLeads estruturado (comprador posta requisito aberto, multiplos fornecedores recebem). | D10, §5.5 |
| T2-13 | Sistema de avaliacao do fornecedor (1-5 estrelas + comentario + moderacao). | §5.5, RF-15.01-03 |
| T2-14 | Variantes de produto UI — ativar `variant_parent_id` com interface. | D8, §5.5 |
| T2-15 | Tabela `product_certifications` com busca. Verticais regulados (farma, EPI). | CATALOGO §6.2 |
| T2-16 | Expansao categorias (meta: 100-200 folhas). Crescimento organico. | CATALOGO §6.2 |
| T2-17 | Product video (YouTube/Vimeo embed) no perfil do produto. | RF-03.14, additions v3 |
| T2-18 | Supplier reply to review (responder avaliacao). | RF-15.04 |
| T2-19 | Lead tags (classificacao de leads no painel supplier). | RF-09.07 |
| T2-20 | "Who viewed my catalog" (quem viu meu catalogo). | RF-09.09 |
| T2-21 | Editorial feeds ("Novos" / "Populares"). | RF-04.10 |
| T2-22 | Inline RFQ na pagina de categoria (cotacao rapida multi-fornecedor). | RF-06.09 |

**Total Tier 2: 22 features.**

---

## 5. Tier 3 — Stretch

Ambicioso. Entra so se Tier 1 sair no prazo e time tiver gas.

| # | Feature | Fonte |
|---|---------|-------|
| T3-1 | Scraping de fornecedores (Juntas Comerciais, CNPJ.ws, Google Maps). Vibe coding Gustavo. | Original 14/04 |
| T3-2 | Enriquecimento via IA (Claude/Gemini API). Vibe coding Gustavo. | Original 14/04 |
| T3-3 | Blog em `/blog` com 4-8 posts seed. Vibe coding Gustavo. | Original 14/04 |
| T3-4 | Autocomplete de busca. | RF-04.05 |
| T3-5 | Paginas SEO programaticas (categoria x localidade). Vibe coding Gustavo. | RF-05.04 |
| T3-6 | Importacao em massa CSV/XLSX. Vibe coding Gustavo. | RF-03.07 |
| T3-7 | Denuncia de supplier (buyer reporta). | RF-11.04 |
| T3-8 | Admin: moderar produtos (aprovar/rejeitar). | RF-12.04 |
| T3-9 | Admin: tratar denuncias. | RF-12.05 |
| T3-10 | Filtros de busca facetados por atributo (Material, Tamanho). | D12, §5.5 |
| T3-11 | Compatibilidade de veiculo (Car Make + Model). Especifico automotivo. | CATALOGO §6.3 |
| T3-12 | Sub-templates de atributos (ex: e-bike dentro de Bicicletas). | CATALOGO §6.3 |
| T3-13 | Importacao em massa de atributos via CSV. | CATALOGO §6.3 |
| T3-14 | Lead Manager pull API (integracao CRM externo). | RF-09.08 |

**Total Tier 3: 14 features.**

---

## 6. Fora do MVP — Fase 2+ (explicitamente adiado)

### Monetizacao (D3-D7: zero no MVP, ativacao progressiva pos-M12)

| Item | Quando | Fonte |
|------|--------|-------|
| Destaque pago (flag booleano + ordenacao) | M12 | D6, Handbook §2.5 |
| GiroB2B Verificado Plus (verificacao humana extra) | M14 | D4, Handbook §2.5 |
| Anuncios nativos (CPC/CPL por keyword/categoria/cidade) | M18 | D5, Handbook §2.5 |
| Destaque self-service (UI compra direta + billing) | M12+ | D6, Handbook §2.5 |
| SMS pra fornecedores pagantes | Pos-M12 | RF-13.05 |
| Sistema creditos de leads / Stripe / Mercado Pago | M12 | §5.4, §7.4 |
| Distribuicao de leads por rodadas (RN-05.02 a RN-05.06) | M12 | RN-05.02, §5.4 |
| Ranking boost por plano (Enterprise 100 / Premium 80 / Pro 60 / Starter 40 / Gratuito 10) | M12 (ativacao real do fator) | RN-03.01 |

### UX avancada e outras features diferidas

- Comparacao lado-a-lado de 3 fornecedores (RF-04.08)
- Favoritos (RF-04.07)
- Alertas de novos fornecedores (RF-10.03)
- Notificacoes push/PWA (RF-13.02)
- App mobile Android/iOS
- Inquiry generica multi-fornecedor com algoritmo distribuicao ponderado (RF-06.06, RN-05.xx)
- CRM completo (pipeline, analytics conversao)
- Integracoes ERP (Bling, Omie, Conta Azul)
- WhatsApp Business API template (tier Pro+)
- Rating bidirecional
- Programa de indicacao estruturado (§6.6)
- Historico rico do comprador
- Reivindicacao de perfil pre-cadastrado (RF-01.12, RN-01.08/09)
- Analytics dashboard rico (RF-09.04, RF-09.06)

---

## 7. Divisao de execucao: Vitor vs Gustavo (vibe coding)

**Vitor (zona de alto risco tecnico):**
- Setup Next.js, Supabase (Auth + Storage + DB), Vercel
- Row Level Security no Postgres
- Autenticacao completa e fluxo de confirmacao
- Validacao server-side CNPJ (BrasilAPI)
- Tabela `category_attribute_templates` + validacao atributos no backend
- Coluna `attributes` JSONB + index GIN + `variant_parent_id`
- Extensao `categories` de 2 pra 4 niveis
- Algoritmo de ranking composto (RN-03.01) com 5 fatores
- Rate limiting e deduplicacao
- Code review do que Gustavo produz

**Gustavo (zona de casca, via Claude Code + Gemini):**
- Componentes UI com shadcn/ui + Tailwind
- Formularios client-side (cadastro, perfil, produto, inquiry)
- Formulario dinamico de atributos (renderiza campos do template)
- Paginas publicas SSR (produto, fornecedor)
- Painel supplier (inquiries, lead manager UI)
- Painel buyer
- Admin dashboard (leitura metricas)
- Upload imagens (Supabase Storage)
- Integracao Resend pra emails transacionais
- SEO: meta tags, Schema.org
- Seed categorias/templates (SQL/JSON do CATALOGO)
- Tier 3 se acontecer: scraping, IA, blog

---

## 8. Stack

**ATENCAO: Vitor eliminou Fastify em maio/2026.** O backend agora vive em Next.js Server Actions + Route Handlers. A stack abaixo reflete o estado REAL do codigo, nao o que foi decidido em 28/04.

| Item | Estado real (maio/2026) |
|------|------------------------|
| Arquitetura | Monorepo pnpm (`apps/web` Next.js + `apps/scraper` Playwright) — `apps/api` Fastify **DELETADO** |
| Backend | Next.js Server Actions + Route Handlers (dentro de `apps/web`) |
| DB driver | `pg` (node-postgres) + `@supabase/supabase-js` direto, sem ORM |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Email | Resend |
| Observabilidade | Sentry |
| CI/CD | Vercel auto-deploy em `main` + GitHub Actions (type-check + lint + build) |
| Carga horaria Vitor | ~25h/semana |
| URL producao | app.girob2b.com.br |

### Politica de testes minima antes de deploy

Testes automatizados obrigatorios:
- **signup/login** (fluxo autenticacao completo)
- **criacao de inquiry** (lead — coracao do MVP)

(Fonte: §5.2, Vitor 10 perguntas)

---

## 9. Cronograma

Estimativas maximas. Velocity real depende da primeira sprint.

| Marco | Estimativa | Condicao |
|-------|-----------|----------|
| Setup inicial (repo, stack, CI, Supabase, Vercel) | 2 semanas | Arquitetura aprovada |
| Tier 1 completo (dev + QA) | 6-10 semanas | Setup pronto |
| Tier 2 parcial | 2-3 semanas adicionais | Tier 1 entregue |
| MVP beta privado (T1 + parte T2) | Final junho/2026 | Sem bloqueios maiores |
| Lancamento publico (T1 + T2) | Outubro/2026 | T1 + T2 em producao |
| Monetizacao ativada | Pos-M12 (dezembro/2026) | Tracao comprovada |

(Fonte: §7.1 a §7.4, §5.3)

---

## 10. Regras de manutencao

- Alteracoes em T1/T2 requerem aprovacao do Gustavo (CEO decide escopo).
- Promocao T3→T2 ou T2→T1 requer reavaliacao de prazo.
- Adicao de features: so se couber nos tiers; senao vai pra "Fora do MVP".
- Reler este doc no inicio de cada sprint.
- Toda feature cita fonte. Sem fonte = verificar nos docs canonicos antes de implementar.

---

## Documentos canonicos referenciados

| Sigla | Documento | Path |
|-------|-----------|------|
| RF-XX.YY | Requisitos Funcionais | `fase1_fundacao/1.4_REQUISITOS_FUNCIONAIS.md` |
| RN-XX.YY | Regras de Negocio | `fase1_fundacao/1.6_REGRAS_DE_NEGOCIO.md` |
| §X.Y Plano v3 | Plano de Negocios v3 | `admin/plano_de_negocios/Plano_de_Negocios_GiroB2B_v3.md` |
| D3-D12 | Decisoes trancadas 02/05 | `admin/_PLANO_V3_GAPS_2026-05-02.md` |
| CATALOGO | Catalogo Multi-Setorial | `admin/CATALOGO_MULTI_SETORIAL.md` |
| Handbook | Manual interno | `admin/HANDBOOK_GIROB2B.md` |
| DNA | DNA GiroB2B | `compartilhado/DNA_GIROB2B.md` |
| Additions v3 | Additions v3 22/04 | Integrado neste documento |
