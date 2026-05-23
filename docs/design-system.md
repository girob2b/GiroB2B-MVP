# GiroB2B — Design System

> Fonte de verdade técnica do DS. Decisões de escala, naming, semântica.
> Para a marca em si (paleta oficial, tom, posicionamento), ver [BRIEF_MARCA.md](brand/BRIEF_MARCA.md).
> Para os valores implementados em CSS, ver [packages/shared/src/design/tokens.css](../packages/shared/src/design/tokens.css).

Criado: 2026-05-18. Última revisão: 2026-05-18.

---

## 1. Princípios

1. **Token over class.** Nunca hardcode cor/spacing em componente — referencia o token semântico.
2. **Semântico over primitivo.** Use `var(--surface-raised)`, não `var(--neutral-0)`. Primitivo só quando o semântico não cobre.
3. **3 superfícies, 1 source.** apps/web, apps/admin e apps/girob2b-landing-page todas importam o mesmo `tokens.css`. Mudar lá = mudar nos três.
4. **Mobile first.** Layouts assumem viewport mínimo `sm` (640px). Acima vai por progressive enhancement.
5. **A11y por default.** Focus ring visível, contraste WCAG AA mínimo, foco programático em modais.

---

## 2. Estrutura do DS

```
packages/shared/src/design/
├── tokens.css        ← fonte de verdade (cor/space/type/radius/shadow/motion/z)
└── README.md         ← como importar nos 3 apps

apps/web/components/ui/         ← primitivos (Button, Input, Card, Dialog, …)
apps/web/components/patterns/   ← compostos (DataTable, PageHeader, EmptyState — Fase 3)
apps/web/components/layout/     ← shells (GuestShell, AuthShell, DashboardShell)

docs/design-system.md           ← este doc (decisões, escalas, naming)
docs/brand/BRIEF_MARCA.md       ← marca (paleta oficial, tom, simbolo)
```

---

## 3. Tokens — decisões

### 3.1 Cores

Duas camadas:

| Camada | Quando usar | Exemplo |
|---|---|---|
| **Primitivos** (`--brand-600`, `--neutral-100`) | Só quando o semântico não cobre — gradientes, overlays customizados | `background: linear-gradient(var(--brand-600), var(--brand-800))` |
| **Semânticos** (`--surface-raised`, `--ink-primary`) | Default. 95% dos usos. | `background: var(--surface-raised)` |

**Escalas primitivas:**
- `--brand-{50…900}` — teal (BRIEF_MARCA primary)
- `--accent-{50…900}` — dourado (BRIEF_MARCA accent)
- `--neutral-{0,50,100,…,900,1000}` — graphite + off-white
- `--success-{50,100,300,500,600,700,900}` — emerald
- `--warning-{50,100,300,500,600,700,900}` — âmbar (NÃO usar o dourado pra warning — confunde com CTA)
- `--danger-{50,100,300,500,600,700,900}` — red
- `--info-{50,100,300,500,600,700,900}` — sky

**Semânticos principais:**

| Token | Uso |
|---|---|
| `--surface` | body / page background |
| `--surface-raised` | cards, popovers, modais (1 nível acima do body) |
| `--surface-sunken` | áreas com hierarquia visual menor que body |
| `--surface-inverse` | footers e heros escuros |
| `--surface-brand` | CTAs primários, headers institucionais |
| `--surface-brand-soft` | callouts brand claros |
| `--ink-primary` | texto principal |
| `--ink-secondary` | texto de suporte |
| `--ink-muted` | texto desativado / placeholder |
| `--ink-inverse` | texto sobre fundo brand/escuro |
| `--border-default` | divisórias padrão |
| `--border-strong` | inputs, separadores fortes |
| `--ring-color` | focus ring (a11y) |

### 3.2 Spacing

Base **4px** (`0.25rem`). Escala segue Tailwind (`--space-0` … `--space-64`) — todo dev brasileiro/contratado entende.

**Paddings nomeados** (use estes em vez de espaços crus quando padronizar densidade):

| Token | Valor | Uso |
|---|---|---|
| `--padding-compact` | 8/12 | botões small, badges, chips |
| `--padding-default` | 12/16 | botões padrão, inputs |
| `--padding-comfortable` | 16/20 | cards densos |
| `--padding-spacious` | 24/32 | section / page level |

### 3.3 Typography

- **DM Sans** para UI (todos os tamanhos).
- **Instrument Serif** apenas para hero displays na landing — não usar no app.
- Escala `xs (12)` → `7xl (72)`. Default `base (16)`.
- Weights: 400 / 500 / 600 / 700.
- Line heights nomeados: tight (1.1) / snug (1.25) / normal (1.5) / relaxed (1.625) / loose (2).
- Letter spacing: tighter (-0.05em) → widest (0.1em). Default = normal (0).

**Regras de aplicação:**

| Elemento | Size | Weight | Line height |
|---|---|---|---|
| Page h1 | 3xl–4xl | 700 | tight |
| Section h2 | xl–2xl | 700 | snug |
| Section h3 | lg | 600 | snug |
| Body | base | 400 | normal |
| Body small | sm | 400 | normal |
| Caption / help | xs | 400/500 | normal |
| UI label | xs–sm | 600 | snug |
| Button | sm | 600 | snug |

### 3.4 Radius

Default = `--radius-lg` (8px). B2B sóbrio — não usar `2xl`/`3xl` em UI funcional.

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | 4 | badges, chips |
| `--radius-md` | 6 | inputs, botões small |
| `--radius-lg` | 8 | **default** — botões, cards, dialogs |
| `--radius-xl` | 12 | cards de hero, modais com pitch |
| `--radius-2xl` | 16 | callouts decorativos |
| `--radius-full` | 9999 | avatares, pills |

### 3.5 Shadow

Ladder progressiva — `xs` → `2xl`. `--shadow-brand` para CTA destacado com tom teal.

- **xs**: card flat com leve elevação
- **sm**: dropdowns
- **md**: cards interativos hover
- **lg**: modais
- **xl**: hero card
- **2xl**: peso máximo — usar com parcimônia

### 3.6 Motion

Durations (5):

| Token | Tempo | Uso |
|---|---|---|
| `--duration-instant` | 100ms | feedback tátil (toggle, checkbox) |
| `--duration-fast` | 150ms | hover, focus |
| `--duration-base` | 200ms | **default** — transições padrão |
| `--duration-slow` | 300ms | abertura de modais, popovers |
| `--duration-slower` | 500ms | entradas elaboradas (hero, onboarding) |

Easings (5):

| Token | Curva | Quando |
|---|---|---|
| `--ease-linear` | linear | progress bars |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | saídas (elemento sai da tela) |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | **default** — entradas |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | mudanças de estado in-place |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | success / celebração — uso pontual |

### 3.7 Z-index

8 layers nomeadas. Nunca usar números crus — sempre `var(--z-modal)`, etc.

```
base (0) → dropdown (10) → sticky (20) → fixed (30) →
overlay (40) → modal (50) → popover (60) → toast (70) → tooltip (80)
```

### 3.8 Breakpoints

Padrão Tailwind. `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`.

Container max = **1400px** (não 1536 — densidade B2B precisa de mais respiro lateral em telas grandes).

---

## 4. Theme — light + dark

Light é o default e o único exposto no MVP. Dark fica preparado em CSS (`.dark { … }`) — só primitivos que não mudam; semânticos invertem. Quando a gente decidir liberar toggle, mexe em 1 lugar (semantic layer) e está pronto.

**Para forçar dark:** `<html class="dark">`. **Para auto:** detectar `prefers-color-scheme` no client e aplicar a classe.

---

## 5. Onde os tokens NÃO mudam

Estas escolhas estão **trancadas** porque alterá-las quebra a marca:

- Brand primary (`--brand-600` = `#0A5C5C`) — BRIEF_MARCA aprovado pelo Gustavo
- Accent (`--accent-500` = `#C08A2E`) — BRIEF_MARCA
- DM Sans como família UI principal — BRIEF_MARCA
- Radius default = 8px — B2B sóbrio (não-fintech, não-tech)

Tudo o mais é mutável via PR.

---

## 6. Convenções de componente (Fase 2+)

Estas regras valem assim que a Fase 2 (primitivos) entrar:

1. **Componente nunca conhece cor.** Só usa `var(--ink-primary)`, etc.
2. **Variant determina semântica, não cor.** `<Button variant="danger">`, nunca `<Button color="red">`.
3. **Densidade é prop.** `<Button size="compact|default|comfortable">` mapeia em `--padding-*`.
4. **Foco programático.** Toda interação com teclado dispara `outline: 2px solid var(--ring-color); outline-offset: var(--ring-offset)`.
5. **A11y mínima.** `aria-label` quando icon-only, `aria-current` em nav, `role="status"` em loaders.

---

## 7. Roadmap

| Fase | Status | Escopo |
|---|---|---|
| 1. Foundations | ✅ 2026-05-18 | `tokens.css` + doc + 3 apps importando |
| 2. Primitivos | Pendente | Auditar 20 components/ui, padronizar variants, dedup web/admin |
| 3. Compostos | Pendente | DataTable, PageHeader, EmptyState, FormSection, Topbar genérico |
| 4. Cleanup | Pendente | Sweep de `px-5`, `py-2.5` mágicos; `/dev/styleguide` interno |
