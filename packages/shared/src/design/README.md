# @girob2b/shared — Design Tokens

Fonte de verdade única de cor / spacing / typography / radius / shadow / motion / z-index pros 3 apps.

Para decisões e naming, ler [docs/design-system.md](../../../../docs/design-system.md).

## Como importar

### apps/web e apps/admin (Next.js + Tailwind 4)

No `app/globals.css`, antes do `@theme inline`:

```css
@import "@girob2b/shared/design/tokens.css";
@import "tailwindcss";

@theme inline {
  /* mapeia tokens primitivos pra tokens do Tailwind */
  --color-brand-50:  var(--brand-50);
  --color-brand-100: var(--brand-100);
  /* ... */
}
```

### apps/girob2b-landing-page (Vite + CSS Modules)

> A landing tem repo git separado (fora do monorepo via .gitignore).
> Os tokens são copiados via `scripts/sync-design-tokens.sh`.

No `src/main.tsx`:

```ts
import "@/styles/design-tokens.css";  // copia local de packages/shared/src/design/tokens.css
import "@/styles/tokens.css";          // aliases locais que apontam pros tokens compartilhados
```

`src/styles/tokens.css` na landing passa a ser só aliases:

```css
:root {
  --color-teal-deep:   var(--brand-600);
  --color-gold-burnt:  var(--accent-500);
  --color-off-white:   var(--neutral-100);
  --color-graphite:    var(--neutral-900);
}
```

## Quando mudar

- **Marca / paleta:** revisar BRIEF_MARCA.md primeiro, depois bater PR em `tokens.css`.
- **Spacing / radius / etc:** PR direto, com print do antes/depois nos 3 apps.
- **Semantic tokens:** PR + atualizar `docs/design-system.md` se mudou semântica.
