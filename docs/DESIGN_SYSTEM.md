# Design System — GiroB2B

> Fonte de verdade da identidade visual. Consolida brief de marca, tokens da landing e tokens do app web.
> Última atualização: 2026-04-26 (revisão "B2B sóbrio": cards menos arredondados, botões flat sem gradient nem sombra, fundo bege em wrappers e auth pages).

---

## 1. Princípios

GiroB2B é um marketplace B2B brasileiro. A marca precisa transmitir **seriedade institucional com calor humano** — sóbria como um banco tradicional, mas com a temperatura de uma negociação em polo comercial. Inspirações: Mastercard (restraint), IndiaMART (familiaridade B2B), Stripe (clareza tipográfica).

**Não é:** SaaS-tech-disruptivo, fintech brilhante, varejo "carnaval", classificados ou marketplace vertical.

---

## 2. Cores

### 2.1 Paleta primária — Teal profundo

Usado em backgrounds institucionais, headings, CTA primário, ícones de marca.

| Token | Hex | Uso |
|---|---|---|
| `--brand-primary-50`  | `#F1F7F7` | hover muito leve, backgrounds calmos |
| `--brand-primary-100` | `#DCE9E9` | tags, chips, banners suaves |
| `--brand-primary-200` | `#B5CECE` | bordas decorativas |
| `--brand-primary-300` | `#7FA7A7` | bordas de hover |
| `--brand-primary-500` | `#1E7878` | start de gradientes |
| `--brand-primary-600` | `#0A5C5C` | **base — CTA primário, ícones** |
| `--brand-primary-700` | `#084A4A` | hover do CTA, headings |
| `--brand-primary-800` | `#063535` | end de gradientes profundos |
| `--brand-primary-900` | `#042121` | texto sobre off-white em alto contraste |

### 2.2 Accent — Dourado queimado

Highlights, badges, simbolo do logo, CTAs secundários de destaque (planos premium).

| Token | Hex | Uso |
|---|---|---|
| `--brand-accent-50`  | `#FBF6EB` | background de seção destaque |
| `--brand-accent-100` | `#F5E7C6` | chip "novo", banner promocional |
| `--brand-accent-200` | `#EBD08C` | borda de pricing card |
| `--brand-accent-300` | `#DDB455` | hover de chip |
| `--brand-accent-500` | `#CC9637` | start de gradiente premium |
| `--brand-accent-600` | `#C08A2E` | **base — anel do logo, CTA gold** |
| `--brand-accent-700` | `#9C7025` | hover do CTA gold |
| `--brand-accent-800` | `#76561C` | texto sobre creme |
| `--brand-accent-900` | `#4E3914` | texto de alta densidade sobre creme |

### 2.3 Neutros e estados

| Token | Hex | Uso |
|---|---|---|
| `--brand-surface` | `#F4F1EA` | off-white cálido — alternativa ao branco puro em seções institucionais |
| `--brand-ink`     | `#1A1F1F` | grafite escuro — texto principal sobre claro, alternativa ao preto |
| `--background`    | `#FFFFFF` | branco puro do app (modo claro) |
| `--foreground`    | grafite via OKLCH | texto base do app |
| `--muted`         | `#F7F7F7` aprox | backgrounds neutros do app |
| `--destructive`   | vermelho via OKLCH | erros, ações destrutivas |

### 2.4 Legacy alias (compat)

`--brand-green-*` ainda existe e aponta para `--brand-primary-*`. Mantido por compatibilidade com ~140 usages no app web. **Código novo deve usar `--brand-primary-*`** — `--brand-green-*` será removido em uma futura limpeza.

### 2.5 Onde estão definidos

- **App web:** [`apps/web/app/globals.css`](../apps/web/app/globals.css) (bloco `:root`)
- **Landing:** [`apps/girob2b-landing-page/src/styles/tokens.css`](../apps/girob2b-landing-page/src/styles/tokens.css)
- **Tailwind:** registrados via `@theme inline` no `globals.css` — disponíveis como `bg-brand-600`, `text-gold-700`, etc.

### 2.6 Combinações proibidas

- Verde-limão `#12C768` (paleta antiga) — lia como fintech/agri.
- Azul + amarelo — território Mercado Livre.
- Vermelho como cor de marca — overused em varejo.
- Cores brilhantes saturadas (carnaval).

---

## 3. Tipografia

### 3.1 Font

**DM Sans** (Google Fonts ou local woff2). Geometria clássica, terminais arredondados, low-contrast — calor B2B sem virar SaaS-tech.

- App web: carregada via `next/font/google` em [`apps/web/app/layout.tsx`](../apps/web/app/layout.tsx). Pesos: 400, 500, 600, 700.
- Landing: carregada via `@font-face` local em [`apps/girob2b-landing-page/src/index.css`](../apps/girob2b-landing-page/src/index.css), arquivos em `src/fonts/DMSans-*.woff2`. Pesos: 400, 500, 700.
- Variável CSS: `--font-sans`. Aplicada como `font-family: var(--font-sans)`.

**Instrument Serif** está reservada em `tokens.css` (`--font-family-display`) mas não é usada em produção. Não introduzir sem alinhar primeiro.

### 3.2 Escala

| Uso | Tamanho | Peso | Tracking |
|---|---|---|---|
| Eyebrow / overline | `text-xs` (0.75rem) | 700 | `0.22em–0.30em` uppercase |
| Caption | `text-xs` (0.75rem) | 400 | normal |
| Body small | `text-sm` (0.875rem) | 400/500 | normal |
| Body | `text-base` (1rem) | 400 | normal |
| Lead | `text-lg–xl` (1.125–1.25rem) | 400/500 | normal |
| H3 | `text-xl–2xl` | 600/700 | `tracking-tight` |
| H2 | `text-2xl–3xl` | 700 | `tracking-tight` |
| H1 (página) | `text-3xl–4xl` | 700 | `tracking-tight` |
| H1 (hero landing) | `text-4xl md:text-5xl` | 800/900 | `leading-[1.1]` |
| Wordmark logo | dimensão dinâmica | 700 | `letter-spacing: -0.03em` |

### 3.3 Regras

- Headings: sempre `tracking-tight` (`-0.02em` aproximado). Wordmark: ainda mais apertado (`-0.03em`).
- Body em UI: `font-weight 400`. Para destaque inline, `font-weight 600` (não 700).
- Eyebrows / labels uppercase: tracking generoso (`0.22em+`) — sem isso ficam apertadas demais.
- Não combinar mais de 2 pesos visíveis em uma mesma tela (excluindo wordmark).

---

## 4. Logotipo

### 4.1 Símbolo — Anel partido B3

Anel orbital em dourado queimado sobre quadrado teal. 3 arcos com gaps simétricos sugerem rotação ("giro"). Variante final aprovada em 2026-04-17 (concept B3, BRIEF_MARCA).

**Componente React:** [`apps/web/components/ui/giro-logo.tsx`](../apps/web/components/ui/giro-logo.tsx). Variantes:
- `dark` (default) — quadrado teal `#0A5C5C` + anel dourado `#C08A2E`. Para fundos claros e cabeçalhos.
- `light` — quadrado off-white `#F4F1EA` + anel dourado. Para fundos teal escuros.
- `mono` — anel grafite `#1A1F1F` sem fundo. Para impressão monocromática.

**Assets estáticos** (landing, em `apps/girob2b-landing-page/public/`):
- `logo-v3-g-isolated.png` — uso geral em header
- `logo-v3-monograma.png` — favicon/app icon
- `logo-v3-flat-mono.png` — impressão
- `logo-v3-favicon.png` — 32×32 / 180×180

### 4.2 Wordmark

`GiroB2B` em DM Sans Bold (700), `letter-spacing: -0.03em`. Importante: é **uma palavra só visualmente** — a leitura "Giro + B2B" separada é indesejada. A coesão tipográfica do bold + tight kerning resolve isso.

### 4.3 Composições padrão

- **Horizontal** (default app): símbolo `+` espaço `+` wordmark, alinhados verticalmente ao centro.
- **Empilhada**: símbolo sobre wordmark — para containers quadrados.
- **Monograma**: símbolo isolado — favicon, app icon, ícone de aba.

### 4.4 Do's

- Manter anel sempre em `--brand-accent-600` sobre fundo `--brand-primary-600`.
- Usar wordmark standalone (sem caixa, sem container).
- Preservar área de respiro mínima = 1× a altura do símbolo.
- Trocar para variante `light` quando aplicar sobre teal profundo.

### 4.5 Don'ts

- ❌ Encaixar texto dentro do anel (vira badge).
- ❌ Adicionar contorno ao anel (vira shield).
- ❌ Aplicar sombra dramática, glow ou gradiente cinematográfico.
- ❌ Alterar a paleta primária — teal + dourado é o par protegido.
- ❌ Usar em fundo colorido aleatório sem aprovação.

---

## 4.5 Superfícies de fundo (revisão 2026-04-26)

A app usa duas superfícies neutras intercaladas pra criar hierarquia sem precisar de sombras pesadas:

| Token | Hex | Onde usar |
|---|---|---|
| `bg-surface` (`--brand-surface`) | `#F4F1EA` | **Wrappers de página** (dashboard, guest, public, admin shells) e **telas de auth** (`/login`, `/cadastro`, `/cadastro/confirmar-email`). Sensação institucional B2B premium sem usar branco puro. |
| `bg-white` | `#FFFFFF` | **Cards, modais, sidebar, área de conteúdo do chat.** Contrasta contra o bege do wrapper, criando elevação visual sem `box-shadow` pesada. |
| `bg-slate-50` | `#F8FAFC` | Estados internos (hover de tabela, alertas neutros, áreas desabilitadas). **Não usar como fundo de página** — usar `bg-surface`. |

**Padrão visual:** wrapper bege → card branco. Esse contraste sutil é o que dá profundidade na app — não precisamos de `shadow-lg` em cada bloco.

**Exceção:** `/recuperar-senha` e `/redefinir-senha` têm split-screen com lateral teal escura (institucional). Mantêm o tratamento próprio.

---

## 5. Layout e espaçamento

### 5.1 Spacing scale

Base Tailwind (multiplos de `0.25rem`). Tokens explícitos da landing em `tokens.css`:

| Token | Valor |
|---|---|
| `--space-1` | 0.25rem |
| `--space-2` | 0.5rem |
| `--space-4` | 1rem |
| `--space-6` | 1.5rem |
| `--space-8` | 2rem |
| `--space-12` | 3rem |
| `--space-16` | 4rem |
| `--space-24` | 6rem |

**Regra prática:** sempre múltiplo de 4px. Padding interno de cards: `p-4` (mobile) → `p-6` (desktop). Gap entre seções: `space-y-6` (UI) → `py-12+` (landing).

### 5.2 Container

- Largura máxima: `max-w-6xl` (72rem) para conteúdo de painel; `--container-max: 1200px` na landing.
- Padding lateral: `px-4` mobile, `px-6 md:px-8` desktop.
- Centralização: `mx-auto`.

### 5.3 Border radius

Escala revisada em **2026-04-26** para padrão B2B sóbrio (menos arredondado). Todos os tokens são derivados de `--radius` em `@theme inline` — **mexer no `--radius` afeta toda a app** (cards, modais, botões, inputs, alertas).

| Token | Valor calculado | Multiplier | Uso |
|---|---|---|---|
| `--radius` (base) | **0.5rem** (8px) | 1× | input/botão padrão |
| `--radius-sm` | 4px | 0.5× | chips pequenos |
| `--radius-md` | 6px | 0.75× | inputs `xs/sm` shadcn |
| `--radius-lg` | 8px | 1× | botões padrão `<Button>` |
| `--radius-xl` | 10px | 1.25× | cards de conteúdo |
| `--radius-2xl` | 12px | 1.5× | cards principais, modais |
| `--radius-3xl` | 14px | 1.75× | hero cards |
| `--radius-4xl` | 16px | 2× | seções destaque |
| `rounded-full` | 9999px | — | avatares, chips circulares, badges status |

**Não usar `rounded-full` em CTAs do app web.** Pill-style fica reservado pra landing (estilo institucional).

### 5.4 Breakpoints

Tailwind default: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`.

Mobile-first sempre — sem breakpoint = mobile.

---

## 6. Componentes

### 6.1 Botões

Definidos em [`apps/web/app/globals.css`](../apps/web/app/globals.css) `@layer components`. **Princípio (revisão 2026-04-26):** botões são **flat** — cor sólida, sem gradient, sem sombra colorida. Profundidade vem do hover (troca de cor 1 step) e do contraste com o fundo.

- **`.btn-primary`** — `bg-brand-700` sólido, hover `bg-brand-800`. CTA principal.
- **`.btn-secondary`** — borda `brand-200`, texto `brand-700`, fundo branco, hover `bg-brand-50`. CTA neutro.
- **`.btn-outline`** — borda `slate-200`, texto `slate-700`, hover `bg-slate-50`. Ações terciárias.
- **`.btn-gold`** — `bg-accent-600` sólido, hover `bg-accent-700`. Destaque pontual (pricing, ações premium).

**O que NÃO fazer em botões:**
- ❌ Gradient inline (`bg-gradient-to-br from-X to-Y`) — drift do design system. Usar `.btn-primary`.
- ❌ Sombra colorida (`shadow-[0_12px_28px_rgba(...)]`) — aboliu em 2026-04-26 por ficar "balão" demais.
- ❌ `rounded-full` no app web — só na landing.

**Pill-style (landing apenas):** `rounded-full px-6 py-3`, uppercase eyebrow nos labels secundários.

**Estados:** `disabled` → `opacity-40 cursor-not-allowed`. `hover` → troca de cor 1 step (ex: `700` → `800`). Sem `opacity-95` nem `hover:-translate`.

### 6.2 Cards

Padrões recorrentes:

- **Card básico:** `bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6`.
- **Card hover:** adicionar `transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md`.
- **Card destaque (CTA section):** `bg-primary-50 border-primary-200` com ícone em circle `bg-primary-100`.
- **Card premium (landing):** `bg-white/90 backdrop-blur` com sombra mais profunda (`shadow-[0_34px_100px_rgba(18,61,43,0.12)]`).

### 6.3 Inputs

- Borda: `border border-slate-200`, focus `ring-2 ring-primary-500`.
- Padding: `px-3 py-2.5`.
- Radius: `rounded-lg` ou `rounded-xl`.
- Placeholder: `text-slate-400`.

### 6.4 Badges / chips

- **Status pill:** `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold`.
- **Eyebrow uppercase:** `text-[10px] font-bold tracking-[0.22em] uppercase text-primary-700`.
- **Tag categoria:** `bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-xs`.

### 6.5 Avatar

shadcn `Avatar` — fallback com `bg-primary-100 text-primary-700 font-bold`, primeira letra do nome.

### 6.6 Dialog / Modal

shadcn `Dialog` (base-ui). Padrão GiroB2B:
- Header com hero gradient (`from-primary-500 via-primary-700 to-primary-800`) altura `h-16`.
- Body em `px-6 pb-6 pt-4 sm:px-8`.
- `max-w-3xl` para perfis e formulários longos.
- `max-h-[92vh] overflow-y-auto` sempre.

---

## 7. Sombras e elevação

| Nível | Token | Uso |
|---|---|---|
| Sutil | `shadow-sm` | cards padrão |
| Médio | `shadow-md` | hover de cards (sutil) |
| Hero landing | `shadow-[0_34px_100px_rgba(18,61,43,0.12)]` | cards de destaque do hero (landing apenas) |
| Pricing pro (landing) | `shadow-[0_20px_60px_-15px_rgba(192,138,46,0.35)]` | card de plano destaque (landing apenas) |

**Regra (revisão 2026-04-26):**
- **Botões não têm sombra.** Removidas `shadow-[0_12px_28px_rgba(10,92,92,...)]` e similares — fica visualmente "balão" e contraria o tom B2B sóbrio.
- Sombras coloridas pesadas ficam apenas em **hero cards da landing**.
- App web: cards usam `shadow-sm` no estado padrão e `shadow-md` no hover. Sem cor.

---

## 8. Gradientes

**Política (revisão 2026-04-26):** gradient é uso restrito. Não vai em CTAs nem em avatares pequenos — fica reservado pra **decoração de fundo** (hero de modal, overlay sutil de auth pages).

| Uso | Definição | Onde |
|---|---|---|
| Hero header (modal de perfil) | `linear-gradient(135deg, var(--brand-primary-500) 0%, var(--brand-primary-700) 55%, var(--brand-primary-800) 100%)` | `<ProfileDialog>` topo |
| Pricing premium (landing) | `linear-gradient(135deg, #C08A2E 0%, #D4A04A 100%)` | landing apenas |
| Overlay sutil em auth | `radial-gradient(circle at top, rgba(10,92,92,0.10), transparent 45%)` + linear pra `--brand-surface` | telas `/recuperar-senha`, `/redefinir-senha`, `/onboarding` |
| Lateral institucional (split-screen auth) | `linear-gradient(155deg, var(--brand-primary-600) 0%, var(--brand-primary-700) 48%, var(--brand-primary-800) 100%)` | `/recuperar-senha` painel direito |

**Não usar gradient em:** CTAs (`.btn-primary` é sólido), avatares pequenos (cor sólida), botões secundários, badges.

---

## 9. Animações e transições

### 9.1 Princípios

- Duração default: `200ms ease-out`. Microinterações sutis, nada acima de `300ms`.
- Hover de card: `hover:-translate-y-0.5 transition-all` (lift sutil).
- Focus ring: imediato, sem fade.
- Skeletons: `animate-pulse` do Tailwind.

### 9.2 Animações nomeadas

- **`step-slide-in-right` / `step-slide-in-left`** ([globals.css](../apps/web/app/globals.css)) — transições de step em onboarding.
- **`page-enter`** — fade + translate-Y de 6px nas páginas do dashboard.
- **`handshakeReachLeft/Right`** (landing) — animação decorativa do hero (`2.8s ease-in-out infinite`).

---

## 10. Iconografia

- **Biblioteca:** [`lucide-react`](https://lucide.dev). Padrão único — não misturar Heroicons, Phosphor, etc.
- **Tamanhos:** `h-3.5 w-3.5` (chip), `h-4 w-4` (UI inline), `h-5 w-5` (cards), `h-6+ w-6+` (heroes).
- **Cor:** herda de `currentColor`. Use classes de texto (`text-primary-600`, `text-slate-400`).
- **Stroke:** padrão `1.5` (default do lucide). Para destaque visual, `strokeWidth={2}`.

---

## 11. Feedback visual

- **Sucesso:** `bg-primary-50 border-primary-200 text-primary-900` + ícone `CheckCircle2`.
- **Aviso:** `bg-amber-50 border-amber-200 text-amber-800` + ícone `AlertCircle`.
- **Erro:** `bg-destructive/10 text-destructive` + ícone `AlertCircle`.
- **Info:** `bg-slate-50 border-slate-200 text-slate-600` + ícone `Info`.

Toasts: shadcn `Sonner`, posição `bottom-right`, `richColors`.

---

## 12. Onde estender

Quando adicionar um novo componente ou padrão:

1. **Tokens primeiro:** se precisa de cor/spacing novo, defina como variável CSS em `globals.css`/`tokens.css` antes de hardcodar.
2. **Reuse o que existe:** prefira `.btn-primary` + classes utilitárias a um botão custom.
3. **Documente aqui:** se o padrão vai aparecer em ≥3 lugares, adicione uma seção neste arquivo.
4. **Não invente paleta:** verde, azul, vermelho, roxo — fora do brief. Cinzas (`slate-*`) e os 2 brand colors (teal + gold) cobrem 95% dos casos.

---

## 13. Referências

- [`docs/brand/BRIEF_MARCA.md`](brand/BRIEF_MARCA.md) — fundamentos da identidade (posicionamento, tom, racional da paleta).
- [`apps/web/app/globals.css`](../apps/web/app/globals.css) — tokens e classes do app.
- [`apps/girob2b-landing-page/src/styles/tokens.css`](../apps/girob2b-landing-page/src/styles/tokens.css) — tokens da landing.
- [`apps/web/components/ui/giro-logo.tsx`](../apps/web/components/ui/giro-logo.tsx) — componente do logo.
