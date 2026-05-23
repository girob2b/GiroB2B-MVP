# @girob2b/design-system

Mini-site interno do Design System. **Local-only — não tem deploy, não tem URL pública.**

Existe pra:
- Visualizar todos os tokens (cores, tipografia, spacing, radius, shadow, motion) na hora de tomar decisão visual
- Catalogar componentes (Fase 3)
- Documentar visualmente os 7 fluxos canônicos (Fase 3 — input: [`docs/casos-de-uso.md`](../../docs/casos-de-uso.md))
- Servir de referência pra IA e devs futuros (versionado no repo, sem deploy)

## Rodar

```bash
# Da raiz do monorepo:
pnpm --filter @girob2b/design-system dev

# → http://localhost:5174
```

## Fonte de verdade dos tokens

`packages/shared/src/design/tokens.css` — mesmo arquivo que `apps/web`, `apps/admin` e
`apps/girob2b-landing-page` consomem. Mudar lá = ver mudança imediata neste mini-site
(HMR via Vite).

## O que NÃO entra aqui

- Conteúdo editorial / copy de produto
- Dados reais (mock só de demonstração visual)
- Lógica de negócio
- Componentes que dependem de Supabase / auth / RPCs
- Build de produção / deploy

## Roadmap

- ✅ **Fase 2** (atual): Overview + 6 páginas de tokens (cores, tipografia, spacing, radius, shadow, motion)
- ⏳ **Fase 3**: galeria de primitivos (Button, Input, Card, Dialog, Badge, etc) + patterns (PageHeader, EmptyState, DataTable) + réplicas dos 7 fluxos canônicos
