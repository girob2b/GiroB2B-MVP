# Handoff tecnico para proxima IA - 2026-04-11

Este documento registra as correcoes e implementacoes feitas em 11/04/2026 para que a proxima IA continue o projeto sem precisar redescobrir o contexto.

## Contexto

- Projeto: GiroB2B em monorepo com `apps/web` (Next.js App Router 16.2.2), `apps/api` (Fastify/tsx/TypeScript) e `packages/shared` (tipos compartilhados).
- Execucao local usada pelo Vitor: Docker Compose.
- O `docker-compose.yml` da raiz usa profiles. Para subir o app principal, use:

```bash
docker compose --profile girob2b up -d --build
docker compose --profile girob2b ps
```

Rodar `docker compose up -d --build` sem profile pode retornar `no service selected`.

## Implementado nesta rodada

### Area de cotacoes no painel

Arquivos adicionados:

- `apps/web/app/(dashboard)/painel/inquiries/page.tsx`
- `apps/web/app/(dashboard)/painel/inquiries/[id]/page.tsx`

Comportamento atual:

- Usuario nao autenticado e redirecionado para `/login`.
- Usuario fornecedor ve inquiries recebidas por `supplier_id`.
- Usuario comprador ve inquiries enviadas por `buyer_id`.
- Usuario com ambos os perfis ainda cai no modo fornecedor primeiro, porque a pagina prioriza `supplierRes.data` quando existe.
- Fornecedor gratuito ve descricao, quantidade, prazo, cidade e data, mas os dados de contato ficam ocultos.
- Fornecedor pago so ve contato quando `supplier.plan !== "free"` e `inquiry.contact_unlocked` for verdadeiro.
- Detalhe da inquiry valida acesso por `supplier_id` ou `buyer_id`; se nao bater com o usuario logado, retorna `notFound()`.

Atualizacao posterior em 2026-04-11:

- `/painel/inquiries` agora e uma Central de Cotacoes com abas `received`, `sent`, `research` e `analysis`.
- A pagina carrega recebidas e enviadas no mesmo render, em vez de escolher fornecedor ou comprador de forma exclusiva.
- Para usuario `both`, o menu agora mostra "Cotacoes" uma unica vez na secao principal; as secoes Comprador/Fornecedor nao duplicam a mesma rota.
- `research` e `analysis` ainda sao placeholders de produto para a proxima etapa; nao ha migration ou IA conectada.
- O Explorar iniciou o fluxo "Negociar direto": o modal do produto agora coleta uma proposta estruturada. Com produtos mockados, salva rascunho em `sessionStorage` e abre o chat com query params; com `supplierId` e `productId` UUID no item, o mesmo fluxo tenta criar a inquiry via `POST /inquiries`.
- O chat mostra um card de contexto para rascunho de negociacao direta quando recebe `?negociar=true`.

Limite conhecido:

- Esta area lista e detalha cotacoes, mas ainda nao implementa a acao de responder, desbloquear contato por credito, arquivar ou denunciar.
- O fluxo publico de "Solicitar Cotacao" ainda precisa ser conectado de ponta a ponta nas telas publicas/busca.

### Navegacao do dashboard

Arquivo alterado:

- `apps/web/components/layout/dashboard-shell.tsx`

Mudancas:

- Adicionada rota `/painel/inquiries` na navegacao de comprador, fornecedor e usuario com ambos os perfis.
- Corrigido link de perfil publico de `/empresa/[slug]` para `/fornecedor/[slug]`.
- Removido link para `/painel/assinatura`, que nao existe no app.
- Substituido uso de `/icon.png` pela composicao existente `GiroLogo`.
- Overlay mobile trocado de `div` clicavel para `button` com `aria-label`.

### Tipos compartilhados e contrato de API

Arquivos alterados:

- `packages/shared/src/types/database.ts`
- `packages/shared/src/types/api.ts`

Mudancas principais:

- Status de inquiry alinhado para `new | viewed | responded | archived | reported`.
- Adicionado `InquiryType = "directed" | "generic"`.
- `supplier_id`, `buyer_name`, `buyer_email`, `city/state` e campos relacionados foram ajustados para refletir melhor nullabilidade real/migrations.
- Adicionados campos modernos de inquiry: `category_id`, `buyer_state`, `buyer_consent_to_share`, `quantity_estimate`, `desired_deadline`, `max_proposals`, `responded_at`, `archived_at`, `unlocked_at`, `unlocked_by_credit`, `report_count`, `dedup_key`, `updated_at`.
- Adicionado contrato `CreateInquiryResponse`.
- Adicionado `PublicProfileLayoutItem` e uso em supplier/profile.
- Adicionada tabela `search_suggestions` nos tipos.

Observacao importante:

- Nao foi aplicada migration nesta rodada. As alteracoes foram em tipos e codigo. Antes de assumir que o banco remoto tem tudo, conferir as migrations em `apps/api/supabase/migrations/011_buyer_activation_and_inquiries.sql` e `012_atomic_inquiry_creation.sql`.

### Build API

Arquivo alterado:

- `apps/api/src/services/inquiries.service.ts`

Motivo:

- O build da API falhava porque importava `SupplierPlan` de `@girob2b/shared`, que resolve para arquivo fora do `rootDir` da API.
- Solucao aplicada: tipo local `SupplierPlan = "free" | "starter" | "pro" | "premium"` no service.

### Reset de senha

Arquivo alterado:

- `apps/web/app/(auth)/redefinir-senha/page.tsx`

Motivo:

- Next 16 exige boundary de `Suspense` para o componente cliente que usa `useSearchParams`.
- `RedefinirSenhaForm` foi envolvido em `Suspense` com fallback simples.

### Limpeza de lint web

Arquivos corrigidos para lint:

- `apps/web/app/(dashboard)/painel/configuracoes/_components/config-form.tsx`
- `apps/web/app/(dashboard)/painel/configuracoes/page.tsx`
- `apps/web/app/(dashboard)/painel/explorar/_components/explorer-search.tsx`
- `apps/web/app/(dashboard)/painel/meu-perfil/page.tsx`
- `apps/web/app/(dashboard)/painel/perfil/page.tsx`
- `apps/web/app/(dashboard)/painel/perfil/perfil-form.tsx`
- `apps/web/app/actions/onboarding.ts`
- `apps/web/app/actions/products.ts`
- `apps/web/app/actions/supplier.ts`
- `apps/web/app/fornecedor/[slug]/page.tsx`

Mudancas:

- Removidos imports/props nao usados.
- Removidos `any` explicitos com interfaces locais ou helpers de erro.
- Corrigidos textos JSX com aspas nao escapadas.
- Removido `setState` sincronico dentro de `useEffect` no explorador. O parametro `empresa` agora inicializa `filters.query` no estado inicial, mas mudancas posteriores de URL enquanto o componente permanece montado nao sincronizam automaticamente.
- Tipado o perfil publico do fornecedor e produtos em `/fornecedor/[slug]`.

## Validacoes executadas

Comandos que passaram:

```bash
npm run lint --workspace=apps/web
npm run build --workspace=apps/web
npm run lint --workspace=apps/api
npm run build --workspace=apps/api
docker compose --profile girob2b up -d --build
docker compose --profile girob2b ps
```

Estado Docker final:

- `girob2b-app` em `http://localhost:3000`
- `girob2b-backend` em `http://localhost:3001`

Verificacao em navegador:

- `http://localhost:3000` redirecionou para `/login`, renderizou a tela de login e nao mostrou overlay de erro.
- `http://localhost:3000/painel/inquiries` sem login redirecionou para `/login?redirect=%2Fpainel%2Finquiries` e nao mostrou overlay de erro.

## Worktree e cuidado para a proxima IA

Antes desta rodada, o worktree ja estava sujo com varias alteracoes do usuario ou de rodadas anteriores. Nao reverta alteracoes sem confirmar com Vitor.

Arquivos que esta rodada tocou diretamente:

- `apps/api/src/services/inquiries.service.ts`
- `apps/web/app/(auth)/redefinir-senha/page.tsx`
- `apps/web/app/(dashboard)/painel/configuracoes/_components/config-form.tsx`
- `apps/web/app/(dashboard)/painel/configuracoes/page.tsx`
- `apps/web/app/(dashboard)/painel/explorar/_components/explorer-search.tsx`
- `apps/web/app/(dashboard)/painel/inquiries/page.tsx`
- `apps/web/app/(dashboard)/painel/inquiries/[id]/page.tsx`
- `apps/web/app/(dashboard)/painel/meu-perfil/page.tsx`
- `apps/web/app/(dashboard)/painel/page.tsx`
- `apps/web/app/(dashboard)/painel/perfil/page.tsx`
- `apps/web/app/(dashboard)/painel/perfil/perfil-form.tsx`
- `apps/web/app/actions/onboarding.ts`
- `apps/web/app/actions/products.ts`
- `apps/web/app/actions/supplier.ts`
- `apps/web/app/fornecedor/[slug]/page.tsx`
- `apps/web/components/layout/dashboard-shell.tsx`
- `packages/shared/src/types/api.ts`
- `packages/shared/src/types/database.ts`

## Proximos passos recomendados

Antes de mexer novamente em cotacoes, leia `docs/COTACOES_MODELO_PRODUTO_IA.md`. Ele registra a decisao de produto tomada com o Vitor: cotacoes devem virar uma Central de Cotacoes com negociacao direta, pesquisa profunda e analise hibrida codigo + IA.

1. Conectar CTA publico "Solicitar Cotacao" ao fluxo real de inquiry.
2. Implementar paginas SEO programaticas pendentes: `/produto/[slug]`, `/categoria/[slug]`, `/fornecedores/[localidade]`, sitemap e robots.
3. Substituir busca mockada de `apps/web/app/(dashboard)/painel/explorar/_components/explorer-search.tsx` por dados reais.
4. Decidir UX para usuario `both` em `/painel/inquiries`: alternar abas Comprador/Fornecedor em vez de priorizar fornecedor.
5. Implementar acoes de lifecycle da inquiry: visualizar, responder, arquivar, denunciar e, futuramente, desbloqueio por credito.
6. Validar no banco remoto se todas as migrations de buyer/inquiries/search_suggestions estao aplicadas antes de depender dos campos novos em producao.
