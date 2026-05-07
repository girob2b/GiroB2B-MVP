> ⚠️ **DOCUMENTO SUPERADO** — As prioridades e modelo descritos aqui foram superados pelo pivô do dia 2026-05-07 (reverse marketplace). Ver `docs/today/MVP_PIVOT_2026-05-07.md` como fonte de verdade. Mantido como histórico da direção anterior.

# Relatório de Varredura do Sistema — GiroB2B

**De:** Gustavo (CEO)
**Para:** Vitor (CTO)
**Data:** 06/05/2026
**Assunto:** Estado do sistema após varredura completa + gaps do MVP + documentação e Figma

---

## 1. O que foi feito

Nos dias 5 e 6 de maio, fiz uma varredura completa do sistema: navegação visual por todas as telas (com conta de teste), leitura do código-fonte (migrations, componentes, actions, schemas, services), e cruzamento feature-por-feature contra o MVP_SCOPE (43 features T1 + 20 regras operacionais).

O documento técnico completo está em `sistema/_CRUZAMENTO_MVP_VS_SISTEMA.md` e `sistema/_VARREDURA_SISTEMA_VITOR.md`.

---

## 2. Reconhecimento — o que está bom

Antes de entrar nos gaps, preciso reconhecer: o sistema está **substancialmente mais avançado** do que o MVP_SCOPE exigia. Você implementou 8 features T2/T3 antes do previsto e 16 features extras que não estavam no escopo. Destaques:

- **Cotação atômica com RPC** — advisory lock + dedup SHA-256 48h + rate limit 10/dia. Componente mais robusto do sistema.
- **CNPJ dual-provider** — BrasilAPI + ReceitaWS com fallback. Profissional.
- **Certificado Digital A1** — diferencial único no mercado BR. Nenhum concorrente tem.
- **Chat + Pipeline + Propostas** — CRM básico que outros marketplaces B2B não oferecem no MVP.
- **Scraper + importação CSV** — acelera supply-side.
- **Completude do perfil** — `calcCompleteness` bate exato com RN-02.01, 9 campos com pesos certos. Cita a regra no comentário do código.
- **FTS + ranking 5 fatores** — `search_explorar` na migration 033 está bem construída (ts_rank_cd ponderado + plano + verificação + geo + frescor). Falta conectar ao código (mais abaixo).
- **Admin separado** — monorepo com app admin próprio. Decisão arquitetural correta.

O coração funciona: buyer se cadastra, busca, envia cotação. Supplier se cadastra, lista produto, recebe email.

---

## 3. Números reais

### Features T1 (43 must-have para lançamento)

| Status | Qtd | % |
|--------|-----|---|
| Existe e funciona | 19 | 44% |
| Parcial ou diverge da spec | 14 | 33% |
| Não existe | 10 | 23% |

### Regras operacionais (20)

| Status | Qtd | % |
|--------|-----|---|
| OK | 9 | 45% |
| Parcial | 8 | 40% |
| Falta | 2 | 10% |
| Não testável (sem dados) | 1 | 5% |

---

## 4. O que falta pro MVP — por prioridade

### Bloqueadores de lançamento (sem esses 3, não lança)

| # | Problema | Esforço | Detalhe |
|---|---------|---------|---------|
| 1 | **`NEXT_PUBLIC_APP_URL` = `http://localhost:3000` em produção** | 5 min | 1 env var no Vercel. Todo o SEO está inoperante — sitemap, robots.txt, JSON-LD, canonical — todos apontam pra localhost. O `.env.example` tem `http://localhost:3000` como default e isso foi pra prod sem trocar. |
| 2 | **Não parece marketplace** | Alto | Visitante anônimo vê dashboard com itens trancados na sidebar. Sem hero, sem categorias browse, sem footer com CNPJ. IndiaMART, ForneceB2B e Alibaba separam homepage pública de dashboard logado. Precisamos de homepage pública separada. |
| 3 | **Sem atributos dinâmicos por categoria** | Alto | Tabela `category_attribute_templates` não existe. Coluna `attributes JSONB` não existe em `products`. Todos os produtos são genéricos — sem filtro por especificação técnica. Isso é o gap técnico mais pesado do MVP. |

### 10 features T1 que não existem

| # MVP | Feature | O que precisa |
|-------|---------|---------------|
| 11 | Templates de atributos por categoria folha | Criar tabela + form dinâmico que renderiza campos do template |
| 12 | Coluna `attributes JSONB` em products | ALTER TABLE + index GIN |
| 13 | Coluna `variant_parent_id` em products | ALTER TABLE (schema-prepared, sem UI) |
| 14 | Atributos inline no card de listagem | Depende de 11/12 |
| 15 | Photo guidelines por categoria | Texto de orientação no form de upload |
| 17 | Seed templates ~48 categorias | Depende de 11. Seed SQL do Catálogo Multi-Setorial |
| 34 | Admin CRUD categorias | `/admin/categorias` com CRUD. Hoje só via SQL |
| 36 | Filtro "Empresas Verificadas" | Toggle no painel de inquiries pra filtrar por buyer verificado |
| 40 | Quota de leads mensal | Coluna + lógica. Default 5 pro gratuito |
| 41/42 | Limite 50 SKUs gratuito + upgrade exige 100% completude | Contagem de produtos por tier + CTA upgrade |

### 14 features parciais que precisam de ajuste

As mais críticas:

| # | Feature | O que falta |
|---|---------|-------------|
| 20/25 | **Busca usa ILIKE, não FTS** | `app/api/search/route.ts` faz ILIKE flat. A RPC `search_explorar` com 5 fatores de ranking existe na migration 033 mas **nenhum código a chama**. Conectar. |
| 37 | **1 de 6 emails implementado** | Só existe `sendNovaCotacaoEmail`. Faltam: boas-vindas, inquiry visualizada, lembretes perfil (3d/7d/14d), lembrete inquiry não visualizada (48h). Sem cron. E o FROM está em `onboarding@resend.dev` — domínio não verificado = spam. |
| 24 | **Metadata estática em `/fornecedor/[slug]`** | Linha 11: `export const metadata = { title: "Perfil do Fornecedor" }`. Todos os fornecedores aparecem com o mesmo título no Google. Trocar por `generateMetadata` dinâmico. |
| 30 | **Lead Manager sem notas nem followup** | Status enum funciona. Faltam campo de notas texto livre e data de followup. |
| 5/R1 | **Ativação buyer diverge da spec** | Onboarding pede seleção explícita de modo. Spec diz role derivado automaticamente. Precisamos decidir qual caminho. |

---

## 5. Documentação — por que não pode continuar sem

**Situação atual:**
- **Zero README** no root do repo
- **Zero arquivos de teste** (0 `.test.ts` em todo o monorepo)
- **`.env.example` incompleto** — falta `RESEND_FROM`, credenciais OAuth Google, variáveis do Cert A1. O default `NEXT_PUBLIC_APP_URL=http://localhost:3000` foi pra produção sem ninguém perceber
- **Mudança de stack não documentada** — Fastify foi eliminado e o backend migrou pra Next.js Server Actions. Isso causou drift em 17+ documentos técnicos que ainda referenciavam Fastify + Prisma
- **Código morto sem documentação** — `search_explorar` RPC com 5 fatores de ranking existe no banco mas nenhum código a chama. Sem documentação de arquitetura, ninguém sabe que existe nem quando conectar

**O retrabalho que isso causa:**

1. **Eu gastei ~6 horas fazendo a varredura** que um README + documentação de arquitetura teriam respondido em 30 minutos. Cada vez que alguém novo olha o sistema, essa conta se repete.

2. **O bug do `NEXT_PUBLIC_APP_URL`** mostra o custo real: o SEO inteiro do site está inoperante em produção — sitemap, robots.txt, JSON-LD, canonical, tudo aponta pra localhost. Ninguém encontra a GiroB2B no Google. Um `.env.example` documentado com nota "TROCAR EM PRODUÇÃO" teria evitado.

3. **A mudança Fastify → Next.js** não foi comunicada nem documentada. Resultado: 17 documentos técnicos ficaram desatualizados, 2 sessões inteiras de trabalho foram gastas corrigindo drift documental, e decisões foram tomadas com base em informação errada. Documentar a mudança no momento levaria 15 minutos. Corrigir depois levou 2 dias.

4. **Sem testes, qualquer mudança é um risco.** O MVP_SCOPE exige testes mínimos de signup/login e criação de inquiry. Hoje são zero. Quando eu ou qualquer outro dev precisar mexer no código, não tem rede de segurança.

**O que preciso de você:**
- **README.md no root** com: como rodar, env vars obrigatórias, arquitetura em 1 parágrafo, decisões recentes
- **`.env.example` completo** com TODAS as variáveis que o app precisa + comentários indicando quais trocar em prod
- **Documentar mudanças de arquitetura** quando acontecerem — não depois, na hora. Um parágrafo no README + comentário no commit message basta
- **Testes mínimos** conforme spec: signup/login + criação de inquiry. Não precisa 100% coverage, precisa do core path testado

---

## 6. Figma / Design — por que não pode continuar sem

**Situação atual:**
- Sem Figma, sem wireframes, sem design system documentado
- 3 shells diferentes pra páginas públicas — navegação inconsistente entre `/explorar`, `/fornecedor/[slug]` e `/produto/[slug]`
- Página 404 em inglês sem branding
- Homepage = dashboard (visitante não entende que é marketplace)

**O retrabalho que isso causa:**

1. **O problema "não parece marketplace"** é o bloqueador #2 do lançamento. Resolver sem Figma significa codar no escuro, iterar em código, jogar fora e refazer. Com um Figma de 2-3 telas (homepage, explorar, perfil fornecedor) antes de codar, a gente alinha visualmente em 1 hora e o dev é direto ao ponto.

2. **3 shells diferentes** = 3 experiências de navegação. Isso acontece quando cada página é construída isolada sem referência visual compartilhada. Um layout base no Figma (header + nav + footer) evita.

3. **Componentes visuais inconsistentes** surgem sem design system. Quando crescer pra 2+ devs, cada um faz de um jeito. Figma com tokens básicos (cores, tipografia, espaçamento) + componentes reutilizáveis resolve.

**O que preciso de você:**
- **Figma com no mínimo 3 telas** antes de codar a homepage pública: (a) homepage visitante anônimo, (b) `/explorar` com cards, (c) perfil fornecedor público. Não precisa ser pixel-perfect — precisa ser referência
- **Layout base** com header/nav/footer consistente pra todas as páginas públicas
- **Tokens básicos** documentados: paleta de cores, tipografia, espaçamento mínimo

---

## 7. Próximos passos sugeridos (ordem de prioridade)

| Ordem | O que | Quem | Esforço |
|-------|-------|------|---------|
| 1 | Corrigir `NEXT_PUBLIC_APP_URL` no Vercel | Vitor | 5 min |
| 2 | README.md + `.env.example` completo | Vitor | 1-2h |
| 3 | Verificar domínio `girob2b.com.br` no Resend (sair do `resend.dev`) | Vitor | 30 min |
| 4 | Figma: 3 telas base (homepage, explorar, perfil público) | Vitor | 4-8h |
| 5 | Trocar metadata estática por `generateMetadata` em `/fornecedor/[slug]` | Vitor | 30 min |
| 6 | Conectar `search_explorar` RPC ao `api/search/route.ts` | Vitor | 2-4h |
| 7 | Migration: `category_attribute_templates` + `attributes JSONB` + `variant_parent_id` | Vitor | 4-8h |
| 8 | Seed: templates atributos pras ~48 categorias folha | Gustavo + Vitor | 2-4h |
| 9 | Form dinâmico de atributos no cadastro de produto | Vitor | 4-8h |
| 10 | 5 templates de email faltantes + cron | Vitor | 4-6h |
| 11 | Homepage pública (baseada no Figma) | Vitor | 8-16h |
| 12 | Testes mínimos (signup/login + inquiry) | Vitor | 4-6h |

**Estimativa total até MVP funcional:** ~40-60h de dev (Vitor) + ~8h doc/design + ~4h alinhamento Gustavo.

---

## 8. Resumo

O sistema tem fundação sólida — cotações, auth, perfil, CNPJ, admin. Muito do trabalho pesado já foi feito. Mas sem documentação, sem Figma e sem os 10 features faltantes, não dá pra lançar.

Os 3 bloqueadores são claros:
1. Fix env var (5 min)
2. Homepage que parece marketplace (precisa Figma antes)
3. Atributos dinâmicos (precisa migrations + form + seed)

Documentação e Figma não são "extras pra depois" — são pré-requisitos pra evitar retrabalho. Cada hora gasta documentando agora economiza 5 horas de correção depois. A prova está nos 17 docs que precisaram ser atualizados por causa da mudança Fastify que não foi documentada.

Vamos alinhar prioridades e começar pelo fix de 5 minutos.

---

*Documento completo de referência: `sistema/_CRUZAMENTO_MVP_VS_SISTEMA.md` (evidência arquivo:linha pra cada feature)*
