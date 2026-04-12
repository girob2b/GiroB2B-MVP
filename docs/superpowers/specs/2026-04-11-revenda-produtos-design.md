# Design: Revenda de Produtos por Importação

**Data:** 2026-04-11
**Autor:** Menzinho (para Vitor)
**Status:** Aprovado para implementação

---

## Contexto

GiroB2B é um marketplace B2B de leads (não transacional). Fornecedores listam produtos grátis, compradores enviam inquiries, fornecedores pagam para desbloquear o contato do comprador.

Muitos fornecedores reais não fabricam tudo o que oferecem — são distribuidores, revendedores ou trading companies que repassam produtos de terceiros. Hoje, um revendedor que queira encher o catálogo com 50 produtos precisa cadastrar cada um do zero: upload de imagem, typing do nome, etc. Isso é atrito e desacelera a adoção.

A feature resolve o atrito de preenchimento rápido: permitir que um fornecedor importe um produto de outro fornecedor do GiroB2B (só imagem e nome) pro seu próprio catálogo, onde depois ele preenche os demais campos. O comprador que eventualmente entrar em contato vai falar com o revendedor; o revendedor se vira offline pra fornecer o material.

---

## Objetivo

Permitir que fornecedores enriqueçam o catálogo deles a partir de produtos de outros fornecedores, preservando: (1) a integridade SEO da plataforma, (2) o respeito ao fornecedor original via opt-in consciente, (3) a clareza pro comprador de que o produto é revenda, e (4) o modelo de lead em que cada fornecedor mantém seus próprios contatos.

---

## Decisões de produto (travadas no brainstorming)

1. **Fonte de importação:** apenas produtos já cadastrados dentro do GiroB2B. Sem scraping de URLs externas.
2. **Campos copiados:** apenas imagem (primeira) e nome do produto. Todos os demais campos (categoria, descrição, preço, MOQ, prazo, endereço de origem, condições de frete) são preenchidos pelo revendedor do zero.
3. **Consentimento:** opt-in global por fornecedor. Default é `false`. O fornecedor marca uma vez nas configurações e a decisão vale para todos os produtos dele. Pode ser desativado a qualquer momento.
4. **Atribuição ao comprador:** badge discreto "Revenda" no card e na página do produto. Sem nome do fornecedor original, sem link de volta.
5. **Roteamento de lead:** 100% para o revendedor. O fornecedor original não é notificado nem recebe inquiry.
6. **Snapshot imutável:** a cópia é independente. Se o original alterar imagem/nome depois, nada muda na cópia. Se o original for deletado, a cópia continua.
7. **Modelo de negócio:** sem comissão, sem split de receita, sem markup automático. É estritamente um atalho de preenchimento de catálogo.
8. **Proteção anti-SEO-poisoning:** busca pública deduplica múltiplas cópias do mesmo original em um único card com o selo "+N fornecedores também oferecem".

---

## Arquitetura

### Modelo de dados

**Migration: `apps/api/supabase/migrations/013_product_relisting.sql`**

```sql
-- Opt-in global do fornecedor original
ALTER TABLE suppliers
  ADD COLUMN allow_relisting boolean NOT NULL DEFAULT false;

-- Lineage no produto
ALTER TABLE products
  ADD COLUMN original_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN is_resold boolean NOT NULL DEFAULT false;

-- Índice pra dedup rápida na busca
CREATE INDEX idx_products_original
  ON products(original_product_id)
  WHERE original_product_id IS NOT NULL;

-- Índice auxiliar pra rate limit de import por revendedor
CREATE INDEX idx_products_resold_created
  ON products(supplier_id, created_at)
  WHERE is_resold = true;
```

**Racional das decisões:**
- `ON DELETE SET NULL` no `original_product_id` — cópias sobrevivem ao delete do original (snapshot imutável).
- `is_resold` é redundante com `original_product_id IS NOT NULL` por ora, mas é mantido como fonte da verdade do selo e da contabilização — se o original for deletado, `original_product_id` vira NULL mas `is_resold` continua `true` (transparência histórica).
- `allow_relisting` default `false` — LGPD/direito autoral: ninguém é relistado sem consentir ativamente.

### Endpoints da API

**Novo: `POST /products/import`**
- Input: `{ original_product_id: string }`
- Autenticação: requer usuário com role supplier
- Fluxo:
  1. Valida UUID válido
  2. Lê o produto original com join no supplier
  3. Valida `supplier.allow_relisting === true`
  4. Valida que o revendedor ≠ fornecedor original (não pode clonar produto próprio)
  5. Valida rate limit por produto: `SELECT COUNT(*) FROM products WHERE original_product_id = $1` < 10
  6. Valida rate limit por revendedor: `SELECT COUNT(*) FROM products WHERE supplier_id = $current AND is_resold = true AND created_at > NOW() - INTERVAL '24 hours'` < 20
  7. Resolve raiz da cadeia: se o original já tem `original_product_id`, usa aquele em vez (mantém cadeia rasa, 1 nível)
  8. Copia a primeira imagem pro bucket do revendedor via Supabase Storage (download + upload)
  9. Cria linha em `products`:
     ```json
     {
       "supplier_id": "<revendedor>",
       "name": "<copiado do original>",
       "images": ["<url-nova-no-bucket-do-revendedor>"],
       "status": "draft",
       "is_resold": true,
       "original_product_id": "<raiz-uuid>",
       "slug": "<gerado-a-partir-do-nome>"
     }
     ```
  10. Retorna `{ id: "<novo-uuid>" }`

**Modificado: `PATCH /supplier/settings`**
- Adicionar `allow_relisting: boolean` no schema Zod e no UPDATE SQL.

### Serviços / helpers

**Novo: `apps/api/src/lib/storage.ts`** — função `copyImageToBucket(sourceUrl, targetSupplierId)` que baixa a imagem do bucket do original (ou URL externa) e faz upload pro bucket do revendedor. Retorna a nova URL.

**Modificado: `apps/api/src/services/products.service.ts`** — adicionar função `importProduct(revendedorSupplierId, originalProductId)` com toda a validação descrita acima.

### Frontend

**Toggle de opt-in** — em `apps/web/app/(dashboard)/painel/configuracoes/_components/config-form.tsx`:
- Seção nova "Revenda de produtos"
- Toggle com label "Permitir que outros fornecedores relistem meus produtos"
- Texto auxiliar curto explicando consequências
- Salva via Server Action que chama `PATCH /supplier/settings`

**Botão "Adicionar ao meu catálogo"** — em `apps/web/app/(dashboard)/painel/explorar/_components/explorer-search.tsx`:
- Só renderiza o botão se: (a) usuário logado é supplier, (b) card tem `supplier.allow_relisting=true`, (c) o supplier do card ≠ o supplier do usuário
- Click → modal de confirmação → POST `/products/import` → redirect `/painel/produtos/{id}/editar`
- Se usuário não logado, botão redireciona pra `/cadastro?redirect=/explorar` (mesmo padrão dos outros CTAs protegidos)

**Página dedicada de import** — nova rota `apps/web/app/(dashboard)/painel/produtos/importar/page.tsx`:
- Mini-explorador só de produtos com `allow_relisting=true`
- Reusa filtros e cards do ExplorerSearch (refatoração leve pra aceitar prop `filterAllowRelisting`)
- Entrada no menu "Novo produto" de `/painel/produtos/page.tsx`

**Banner de rascunho** — em `apps/web/app/(dashboard)/painel/produtos/[id]/editar/page.tsx`:
- Se `product.is_resold === true` e `product.status === 'draft'`, mostra um alerta amarelo no topo:
  > "Este produto foi importado como rascunho. Preencha categoria, descrição, faixa de preço e prazo antes de publicar."

**Badge "Revenda"** — novo componente `apps/web/components/ui/resold-badge.tsx`:
- Simples: `<Badge variant="outline" className="...">Revenda</Badge>`
- Usado em: card do ExplorerSearch, página `/fornecedor/[slug]`, futura página `/produto/[slug]`

**Deduplicação na busca** — em `ExplorerSearch` (cliente, client-side sobre resultados mock por enquanto; quando a busca real vier do backend, a lógica migra pra query SQL):
- Agrupa resultados por `original_product_id` (ou pelo próprio id se for original)
- Mostra 1 card por grupo, com selo "+N fornecedores também oferecem este produto" quando grupo > 1
- Card representante é o raiz (`is_resold=false` do grupo) ou, em fallback, o mais antigo

**Canonical URL (SEO)** — em `apps/web/app/fornecedor/[slug]/page.tsx` e futura `/produto/[slug]/page.tsx`:
- Metadata com `alternates.canonical` apontando pro slug do original se `is_resold=true`

### Types compartilhados

**`packages/shared/src/types/database.ts`:**
- `Supplier.allow_relisting: boolean`
- `Product.original_product_id: string | null`
- `Product.is_resold: boolean`

**`packages/shared/src/types/api.ts`:**
- `ImportProductRequest = { original_product_id: string }`
- `ImportProductResponse = { id: string }`

---

## Regras e limites

1. **Rate limit por produto original:** ≤ 10 cópias ativas. Após isso, botão some pros outros revendedores.
2. **Rate limit por revendedor:** ≤ 20 imports/24h. Evita bot/scraping.
3. **Não pode clonar produto próprio:** validação óbvia mas explícita.
4. **Cadeia rasa:** resolver raiz na criação, não permitir cadeias > 1.
5. **Opt-in obrigatório:** se `allow_relisting=false` do original, import retorna 403.
6. **Draft obrigatório:** produto importado sempre entra como `draft`. Revendedor tem que preencher antes de publicar.

---

## Fora de escopo (decidido não fazer)

- Sincronização de imagem/nome entre original e cópia. Snapshot é definitivo.
- Roteamento de lead pro original. Revendedor é o único contato.
- Comissão, split de receita ou qualquer fluxo monetário.
- Claim/reivindicação de perfil (já está no roadmap de Validação).
- White-label ou cadastro do "fornecedor de verdade atrás da revenda".
- Scraping de URLs externas.
- Multi-imagem (só a primeira imagem é copiada; revendedor pode adicionar mais depois manualmente).
- Notificação push/email pro original quando alguém clona um produto dele.

---

## Verificação end-to-end

1. **Migration aplica sem erro:** `docker compose exec girob2b-backend npm run migrate` (ou via SQL direto no Supabase SQL Editor).
2. **Opt-in salva:** logar como supplier A, ir em Configurações, ligar toggle, recarregar página, confirmar estado.
3. **Botão "Adicionar ao meu catálogo" aparece:** logar como supplier B, ir em `/explorar`, navegar pros produtos de A, ver botão nos cards.
4. **Import cria rascunho:** clicar, confirmar modal, ser redirecionado pra `/painel/produtos/{id}/editar` com banner amarelo. Ver que imagem e nome foram copiados, demais campos vazios.
5. **Produto em draft não aparece na busca:** verificar que o produto importado NÃO aparece em `/explorar` enquanto não for publicado.
6. **Publicar + badge:** supplier B preenche os campos restantes, clica "Publicar". Ver que agora aparece na busca com badge "Revenda".
7. **Dedup funciona:** clonar o mesmo produto com um terceiro supplier C. Na busca, ver só 1 card representante com "+2 fornecedores também oferecem".
8. **Rate limit por produto:** tentar clonar 11× o mesmo produto com suppliers diferentes. O 11º deve falhar com erro 429.
9. **Opt-in desligado bloqueia:** supplier A desliga o toggle. Supplier D tenta clonar produto de A. Deve falhar com 403.
10. **Snapshot imutável:** supplier A muda a imagem do produto original. Cópia do supplier B não muda.

---

## Ordem de construção (build order)

Para minimizar refactor e permitir testes incrementais:

1. **Backend primeiro:**
   - (a) Migration SQL
   - (b) Types compartilhados (`packages/shared`)
   - (c) Helper `copyImageToBucket`
   - (d) Service `importProduct` + rota `POST /products/import`
   - (e) PATCH `/supplier/settings` com campo `allow_relisting`
   - (f) Smoke test: curl no novo endpoint

2. **Frontend — peças isoladas:**
   - (g) Componente `resold-badge.tsx`
   - (h) Toggle de opt-in em `/painel/configuracoes`
   - (i) Banner "rascunho" em `/painel/produtos/{id}/editar`

3. **Frontend — fluxo de import:**
   - (j) Botão "Adicionar ao meu catálogo" nos cards do ExplorerSearch (com auth-check reaproveitado dos edits anteriores)
   - (k) Modal de confirmação + chamada POST /products/import + redirect
   - (l) Página `/painel/produtos/importar` (mini-explorador filtrado)
   - (m) Entrada no menu "Novo produto"

4. **Frontend — experiência do comprador:**
   - (n) Renderização do badge "Revenda" nos cards
   - (o) Lógica de deduplicação dos resultados
   - (p) Canonical URL no `/fornecedor/[slug]`

5. **Verificação:**
   - (q) Seguir roteiro end-to-end do passo anterior
   - (r) Restart do container girob2b-app pra pegar as mudanças (volume mount + polling do Windows)

---

## Riscos conhecidos

- **Polling lento no Windows:** mudanças no código podem levar alguns segundos pra serem detectadas pelo Turbopack. Mitigação: `docker compose restart girob2b-app` quando necessário.
- **Supabase Storage free tier:** 1 GB total. Cada cópia duplica uma imagem (~500 KB em média). MVP suporta ~2.000 cópias antes de estourar — suficiente pra validação.
- **RLS:** este spec assume que as políticas de Row Level Security do Supabase permitem `INSERT` em `products` pelo próprio supplier e `SELECT` público em produtos publicados. Se alguma policy bloquear, vai aparecer no smoke test e precisa ajustar a migration.
- **Slug colidindo:** dois revendedores clonando o mesmo produto vão gerar slugs iguais. Mitigação: append `-{short-uuid}` no slug do produto importado pra garantir unicidade.
