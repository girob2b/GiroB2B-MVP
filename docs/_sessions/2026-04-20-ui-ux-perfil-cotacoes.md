# Sessão 2026-04-20 — UI/UX: Perfil, Cotações, Animações

**Projeto:** girob2b / apps/web  
**Data:** 2026-04-20  
**Arquivos principais tocados:** `perfil-form.tsx`, `page.tsx` (perfil), `actions/user.ts`, `actions/inquiries.ts`, `dashboard-shell.tsx`, `globals.css`, `navigation-progress.tsx`, `inquiries/page.tsx`, `inquiries/nova/`

---

## 1. Migração de toasts (auth forms)

Substituição de alertas inline por `toast.error()` / `toast.success()` do Sonner v2.

| Arquivo | O que mudou |
|---|---|
| `app/(auth)/cadastro/buyer-register-form.tsx` | Removido `renderAlert()`, `setHelperMessage`, `setErrorMessage` — tudo via toast |
| `app/(auth)/recuperar-senha/recuperar-senha-form.tsx` | Removido `errorMsg` state e div inline; catch → `toast.error()` |
| `app/(auth)/redefinir-senha/redefinir-senha-form.tsx` | Removido `errorMessage` state; `setStatus("error")` → `setStatus("ready")` + `toast.error()` |

---

## 2. Animações de navegação e estados de carregamento

### `components/navigation-progress.tsx` (novo)
Barra de progresso topo-de-tela customizada (sem dependência externa — `nextjs-toploader` bloqueado por erro `ENOTEMPTY` do `@img/sharp`).
- Click listener em anchors de rotas internas → inicia trickle de 0→85%
- `useEffect` no `pathname` → completa para 100% e some em 320ms
- Cor: `--brand-primary-500` com glow

### `app/layout.tsx`
Adicionado `<NavigationProgress />` como primeiro filho do `<body>`.

### `app/(dashboard)/template.tsx` (novo)
```tsx
export default function DashboardTemplate({ children }) {
  return <div className="page-enter">{children}</div>;
}
```
Usa `template.tsx` (remonta em cada navegação, diferente de `layout.tsx`) para disparar animação de fade-in.

### `app/globals.css`
```css
@keyframes page-enter {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.page-enter { animation: page-enter 0.18s ease-out both; }
```

### `components/layout/dashboard-shell.tsx`
- `pendingHref` state + `useEffect` no pathname para limpar
- Click em link → `setPendingHref(href)` → exibe `<Loader2 animate-spin>` no lugar do ícone
- Sidebar: `bg-[color:var(--brand-primary-600)]` (teal) com textos/ícones em branco

### Loading skeletons (novos)
`components/ui/page-skeleton.tsx` — `PageSkeleton` e `FormSkeleton` com `animate-pulse`.

`loading.tsx` criados em 5 rotas:
- `painel/loading.tsx` → `<PageSkeleton />`
- `painel/produtos/loading.tsx` → `<PageSkeleton />`
- `painel/inquiries/loading.tsx` → `<PageSkeleton />`
- `painel/perfil/loading.tsx` → `<FormSkeleton />`
- `painel/configuracoes/loading.tsx` → `<FormSkeleton />`

---

## 3. Aba GERAL e nova estrutura de cotações

### `apps/api/supabase/migrations/018_generic_inquiries.sql` (novo — pendente aplicação)
- `ALTER TABLE inquiries ALTER COLUMN supplier_id DROP NOT NULL`
- `ADD COLUMN target_price TEXT`
- `ADD COLUMN contact_type TEXT CHECK (...IN ('fabricante','importador','atacado'))`
- RLS: suppliers podem SELECT generic; buyers podem SELECT próprias e INSERT generic

### `app/actions/inquiries.ts` (novo)
`createGenericInquiry` — server action para cotações públicas:
- Valida `product_name` e `quantity`
- Insere com `inquiry_type: "generic"`, `supplier_id: null`
- Lazy-cria buyer profile se necessário

### `app/(dashboard)/painel/inquiries/nova/page.tsx` + `nova-inquiry-form.tsx` (novos)
Formulário de nova cotação pública:
- Campos: nome do produto, quantidade (obrigatórios), preço-alvo (opcional)
- Radio: Qualquer / Fabricante / Importador / Atacado
- Textarea de detalhes
- Redireciona para `?tab=general` no sucesso

### `app/(dashboard)/painel/inquiries/page.tsx` (refatorado)
Tabs com visibilidade baseada em role:

| Role | Tabs visíveis |
|---|---|
| Só vendedor | Geral + Recebidas |
| Só comprador | Geral + Enviadas |
| Ambos | Geral + Recebidas + Enviadas + Pesquisa + Análise |

- `visibleTabs(hasSupplier, hasBuyer)` — filtra tabs por role
- `GenericInquiryList` — lista cotações públicas com botão "Tenho interesse" (para fornecedores)
- Botão "Nova cotação" visível só para buyers
- Recebidas: sem CTA (só leitura)

---

## 4. Página de Perfil — redesign UX

### `app/(dashboard)/painel/perfil/page.tsx`
- `max-w-3xl` → `max-w-5xl`
- Agora busca também `buyers` para passar `hasBuyer` ao form

### `app/(dashboard)/painel/perfil/perfil-form.tsx` (grande refatoração)

**Antes:** ~9 cards em scroll único vertical (~1800px).  
**Depois:** 4 tabs com botão Salvar por tab (~400px de scroll máximo).

#### Tab: Básico
- Banner de identidade (texto puro — sem inputs disabled que confundem)
- Card **Modo de uso**: radio cards para Só comprar / Só vender / Comprar e vender
- Card **Contato e Operação**: telefone, whatsapp, endereço, horário

#### Tab: Apresentação
- Card **Mídia**: Logo + Fotos juntos (era 2 cards separados)
- Card **Sobre a Empresa**: descrição, ano fundação, nº funcionários
- Card **Redes Sociais e Site**: website, instagram, linkedin

#### Tab: Categorias
- **Two-panel picker** substituindo grid de botões:
  - Painel esquerdo: lista de categorias raiz com badge de contagem selecionada
  - Painel direito: subcategorias com checkboxes da categoria ativa
  - Chips removíveis abaixo mostrando "Categoria / Subcategoria"
- Estado `activeRoot` inicializado na primeira categoria raiz

#### Tab: Avançado
- CMS de blocos drag-and-drop (escondido de usuários novos)

**Implementação:** um `<form>` único, tabs mostradas/ocultadas via classe `hidden` (todos os inputs ficam no DOM, submetidos corretamente de qualquer tab).

---

## 5. Modo de uso da plataforma

### `app/actions/user.ts` (novo)
`updatePlatformUsage(mode: "buyer" | "supplier" | "both")`:
- Cria buyer record se ativando modo comprador (nome do user_metadata, email, lgpd_consent)
- Deleta buyer record se desativando modo comprador
- Retorna erro se tentar ativar vendedor sem cadastro completo
- Retorna erro se tentar desativar vendedor (requer suporte)
- `revalidatePath("/painel/perfil")` ao sucesso

### `perfil-form.tsx` — seção Modo de uso
- `useTransition` para chamada não-bloqueante
- Estado `selectedMode` inicializado a partir de `hasBuyer`
- Botão "Atualizar modo" habilitado só quando há mudança pendente
- Texto de status mostra modo atual ou alerta de mudança não salva
- `router.refresh()` após sucesso para refletir novo role no layout

---

## 6. Configurações — grid 2 colunas

### `app/(dashboard)/painel/configuracoes/_components/config-form.tsx`
Reorganização do formulário de configurações (de vendor/supplier):
- `lg:grid-cols-2` ativado em ≥1024px
- Coluna esquerda: Identificação + Dados fiscais
- Coluna direita: Endereço + Revenda de produtos
- Botão Salvar full-width no rodapé

---

---

## 7. Bug fix — dropdown de conta inacessível com sidebar colapsada

**Arquivo:** `components/layout/dashboard-shell.tsx`

**Causa raiz:** o `<aside>` tinha `overflow-hidden` que cortava qualquer elemento absolutamente posicionado que saísse dos limites do `w-16`. O dropdown de conta ao abrir lateralmente (`left-full ml-2`) ficava invisível/inacessível.

**Fix:** movido `overflow-hidden` para um wrapper `<div>` interno que abraça apenas o logo + nav. O footer (com o botão de conta e o dropdown) ficou fora desse wrapper — o dropdown agora escapa corretamente para a direita quando a sidebar está colapsada.

---

---

## 8. Persistência da sidebar via cookie + cookie consent

### Cookie consent (`components/cookie-banner.tsx`)
Já existia implementado. Banner aparece na primeira visita (detecta `localStorage["girob2b.cookie-consent"]`). Três categorias: Essenciais (sempre ativo) / Analíticos / Marketing. Opções: Aceitar todos, Somente essenciais, Personalizar.

### Preferência da sidebar
**Cookie:** `girob2b_sidebar` — valor `"1"` (colapsada) ou `"0"` (expandida). Max-age: 1 ano.

**Consentimento:** a preferência só é salva se o usuário já tiver interagido com o banner (qualquer escolha — `updatedAt` presente no localStorage). A sidebar é um cookie de preferência funcional.

**Leitura SSR (`app/(dashboard)/layout.tsx`):**
```ts
import { cookies } from "next/headers";
const cookieStore = await cookies();
const initialCollapsed = cookieStore.get("girob2b_sidebar")?.value === "1";
```
Passa `initialCollapsed` para `DashboardShell` — sem flash de estado errado na hidratação.

**Escrita cliente (`dashboard-shell.tsx`):**
- `hasConsent()` — verifica `localStorage["girob2b.cookie-consent"].updatedAt`
- `saveSidebarPref(collapsed)` — escreve o cookie só se houver consentimento
- `onToggleCollapse` usa `setCollapsed(c => { const next = !c; saveSidebarPref(next); return next; })`

---

## Pendências desta sessão

- [x] **Migration 018 aplicada** — `inquiries` tem `target_price`, `contact_type`, `supplier_id` nullable
- [x] **Migration 019 aplicada** — `products.visibility` + view `product_listings` recriada com filtro `visibility='global'`
- [x] **Migration 020 aplicada** — tabela `supplier_catalogs` + bucket `supplier-catalogs` (público, 20MB) no Storage
- [ ] Testar fluxo completo de criação de cotação pública (nova-inquiry-form → GERAL)
- [ ] Testar toggle de modo comprador (criar + deletar buyer record)
- [ ] Verificar two-panel picker com dados reais de categorias
- [x] **Testar formulário de produto com campo de visibilidade** — `chat_only` salva corretamente; **bug fix:** `visibility` não estava no `CreateProductSchema` (Zod stripava o campo); adicionado em `apps/api/src/schemas/products.schema.ts`
- [x] **Testar chat na sidebar** — renderiza dois painéis (lista + painel direito), empty state correto, CTA "Explorar produtos" funcional
- [x] **Migration 021 aplicada** — `pipeline_columns` + `pipeline_cards` com RLS no Supabase Cloud
- [x] **Testar pipeline end-to-end** — 5 colunas padrão criadas, add card (inline), modal com todos os campos, mover via modal, drag & drop entre colunas — tudo funcional

---

## Bug fixes descobertos nos testes (sessão continuação)

### `apps/web/app/(dashboard)/painel/produtos/page.tsx`
- **Bug:** SELECT incluía `is_resold` (migration 014 não aplicada ao cloud) → Supabase retornava `null` → lista sempre mostrava 0 produtos
- **Fix:** removido `is_resold` do SELECT, da interface `ProductRow` e do JSX

### `apps/web/app/(dashboard)/painel/produtos/[id]/page.tsx`
- **Bug:** mesmo problema com `is_resold` → `product` era `null` → `notFound()` sempre chamado → página sempre 404
- **Fix:** removido `is_resold`, adicionado `visibility` no SELECT; interface atualizada

### `apps/api/src/schemas/products.schema.ts`
- **Bug:** `visibility` ausente no `CreateProductSchema` → Zod stripava o campo no UPDATE → sempre gravava `global` mesmo selecionando `chat_only`
- **Fix:** adicionado `visibility: z.enum(["global", "chat_only"]).default("global")` ao schema

---

## 9. Features implementadas (continuação de sessão)

### `lib/features.ts`
- `chat: false` → `chat: true` — chat de negociação volta para a sidebar

### `apps/api/supabase/migrations/019_product_visibility.sql` (novo — pendente aplicação)
- `ADD COLUMN visibility TEXT NOT NULL DEFAULT 'global' CHECK (visibility IN ('global', 'chat_only'))`
- Recria `product_listings` view com filtro `AND p.visibility = 'global'` no WHERE — produtos chat_only nunca aparecem nas buscas públicas

### `app/(dashboard)/painel/produtos/_components/produto-form.tsx`
- Novo campo `visibility` (state local inicializado em `defaultValues?.visibility ?? 'global'`)
- Card "Visibilidade" com dois radio cards: "Visível globalmente" / "Apenas via chat"
- `<input type="hidden" name="visibility" value={visibility} />` submete junto com o form
- `ProductData` interface: adicionado `visibility?: string`

### `app/actions/products.ts`
- `parseProductFormData` agora lê `visibility` do FormData com validação de whitelist

### `app/(dashboard)/painel/page.tsx` — SupplierHome
- Empty state de inquiries: novo CTA primário "Ver cotações disponíveis" → `/painel/inquiries?tab=general`; "Adicionar produto" rebaixado para botão outline secundário
- Nudge de produto sem catálogo: cor amber (alerta), texto reforça que fornecedores sem produtos não aparecem nas buscas

---

## Arquivos criados nesta sessão

```
apps/web/
  app/
    actions/
      inquiries.ts              (novo)
      user.ts                   (novo)
    (auth)/
      recuperar-senha/recuperar-senha-form.tsx   (toast migration)
      redefinir-senha/redefinir-senha-form.tsx   (toast migration)
      cadastro/buyer-register-form.tsx           (toast migration)
    (dashboard)/
      template.tsx              (novo)
      painel/
        inquiries/
          nova/
            page.tsx            (novo)
            nova-inquiry-form.tsx (novo)
  components/
    navigation-progress.tsx     (novo)
    ui/
      page-skeleton.tsx         (novo)

apps/api/supabase/migrations/
  018_generic_inquiries.sql     (aplicado ✓)
  019_product_visibility.sql    (aplicado ✓)
  020_supplier_catalogs.sql     (aplicado ✓)
  021_pipeline.sql              (novo — aplicado ✓)

_sessions/
  2026-04-20-ui-ux-perfil-cotacoes.md  (este arquivo)
```

---

## 10. Pipeline Comercial (continuação — mesma data)

### Ideia registrada e implementada

Duas ideias registradas no AVISOS como backlog:
1. **Comparador de Cotações** — score de melhor compra baseado em preço/prazo/frete (pendente)
2. **Pipeline Comercial** — implementado nesta sessão

### `apps/api/supabase/migrations/021_pipeline.sql` (novo — aplicado)
- `pipeline_columns`: `id, user_id, title, position, color(slate|green|red|amber|blue), created_at`
- `pipeline_cards`: `id, column_id, user_id, title, description, contact_name, product_name, inquiry_id, position, due_date, created_at`
- RLS: usuário gerencia apenas os próprios registros
- Indexes em `(user_id, position)` para colunas e `(column_id, position)` para cards

### `app/actions/pipeline.ts` (novo)
- `addCard(columnId, title, extra?)` — insere card, posição = count atual da coluna
- `updateCard(cardId, data)` — atualiza title, description, contact_name, product_name, due_date
- `moveCard(cardId, targetColumnId)` — move card para outra coluna (posição = fim)
- `deleteCard(cardId)` — remove card
- `addColumn(title, color?)` — insere coluna, posição = count atual
- `renameColumn(columnId, title)` — renomeia coluna
- `deleteColumn(columnId)` — só permite se coluna estiver vazia

### `app/(dashboard)/painel/pipeline/page.tsx` (novo)
- Server component — busca colunas + cards do usuário
- Se nenhuma coluna existe, cria defaults automaticamente baseado no role:
  - **Supplier/Both:** Novos contatos (blue) → Em negociação (amber) → Proposta enviada (slate) → Fechado (green) → Perdido (red)
  - **Buyer:** Cotações enviadas (blue) → Aguardando resposta (amber) → Comparando ofertas (slate) → Pedido realizado (green) → Finalizado (slate)

### `app/(dashboard)/painel/pipeline/_components/pipeline-board.tsx` (novo)
- Drag & drop nativo HTML5 (sem lib externa) com update otimista
- Modal de edição do card: title, description, contact_name, product_name, due_date, mover para coluna
- Inline add card (textarea, Enter salva, Escape cancela)
- Inline add coluna com seletor de 5 cores
- Duplo-clique no header da coluna para renomear inline
- Menu de coluna (hover `▾`): renomear + excluir (só se vazia)
- Cards exibem badges: contato (User), produto (Package), prazo (CalendarDays — vermelho se vencido)

### `lib/features.ts`
- Adicionado `pipeline: true`

### `components/layout/dashboard-shell.tsx`
- Ícone `FileText` para Cotações (era `MessageSquare`)
- Ícone `KanbanSquare` para Pipeline — aparece nos navs buyer, supplier e both
- Importado `KanbanSquare` do lucide-react

---

## 9. Propostas Formais — migration 022 + feature completa + bugfixes

### Migration 022 aplicada ao Supabase Cloud
- Tabela `proposals`, colunas `proposal_id`/`origin` em `pipeline_cards`, `proposal_ref` em `chat_messages`
- Funções SECURITY DEFINER: `create_proposal_pipeline_cards` e `move_proposal_pipeline_cards`
- `move_proposal_pipeline_cards` atualizada: auto-resolve user_ids via JOIN (bypassa RLS), com fallback nos params

### Bugfixes identificados e corrigidos no teste E2E

| Bug | Arquivo | Fix |
|---|---|---|
| `chat/page.tsx` lia `user_profiles.role` (retornava `"user"`) → botão proposta não aparecia | `chat/page.tsx` | Computar role via queries em `buyers`/`suppliers` |
| `latestProposalMsgId` incluía event pills (`action ≠ "sent"`) → card original ficava com `isLatest=false` após mudança de status | `chat-interface.tsx` | Filtrar apenas `action === "sent"` |
| Event pills mostravam label do status LIVE (ex: todos viravam "Concluído") — pills devem ser imutáveis | `proposal-card.tsx` | Usar `STATUS[action]` (não `STATUS[status]`) para configurar a pill |
| `buyerId`/`supplierId` não desestruturados na função `ChatInterface` → `ReferenceError` | `chat-interface.tsx` | Adicionar ao destructure |
| Botões de ação usavam role global (`isBuyer`/`isSupplier`) → usuário "both" via supplier via "Confirmar recebimento" | `proposal-card.tsx` | `isProposalBuyer`/`isProposalSupplier` compara `proposal.buyer_id === buyerId` |
| "Revisar e reenviar" continuava aparecendo após revisão já enviada | `proposal-card.tsx` + `chat-interface.tsx` | Prop `hasRevision` derivado do `parent_id` dos proposals no mapa |
| Hydration mismatch: server UTC vs client BRT no timestamp da lista de conversas | `chat-interface.tsx` | `suppressHydrationWarning` no span do timestamp |
| Pipeline do fornecedor (`move_proposal_pipeline_cards`) não resolvia user_ids (RLS bloqueava leitura da tabela `buyers`) | `022_proposals.sql` (Supabase Cloud) | Self-resolve via JOIN em `proposals` (SECURITY DEFINER bypass RLS) |

### Limitação conhecida (não corrigida — documentada em AVISOS)
- Pipeline do comprador: `move_proposal_pipeline_cards` busca colunas por título exato ("Aceita", "Recusada", "Concluído"). Se o usuário tem colunas com outros nomes (ex: "Fechado"), os cards não movem automaticamente — ficam em "Proposta enviada". Cards podem ser movidos manualmente.

### Fluxo E2E testado e validado
`sent → refused (motivo) → revised (buyer reenvia) → accepted (fornecedor) → shipped (fornecedor) → completed (buyer confirma)` — todos os passos funcionando corretamente com Realtime updates bilaterais.
