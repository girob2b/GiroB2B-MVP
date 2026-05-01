# Tests — apps/web

Cobertura mínima E2E exigida pelo [`docs/MVP_SCOPE.md`](../../../docs/MVP_SCOPE.md) §8 antes de qualquer deploy de produção.

## Setup (uma vez)

```bash
# Da raiz do monorepo:
pnpm install                                      # instala todos os workspaces
pnpm --filter @girob2b/web exec playwright install --with-deps chromium
```

> Se `pnpm install` falhar com permissão em `node_modules`, sobrou leftover
> de instalação antiga com owner root: `sudo rm -rf apps/*/node_modules`.

## Rodar

Dev server precisa estar de pé (Playwright config aponta pra `http://localhost:3000`).

```bash
# Em um terminal (raiz do repo):
pnpm run dev          # sobe WEB + LANDING via concurrently
# alternativa: pnpm run dev:web (só Next)

# Em outro terminal:
pnpm --filter @girob2b/web test:e2e        # headless
pnpm --filter @girob2b/web test:e2e:ui     # UI mode (debug visual)
```

> Se a porta 3000/5173 estiver ocupada por processo zumbi, libere com
> `lsof -ti:3000 | xargs kill -9` (substituindo a porta).

Para apontar pra outra URL (preview/staging):

```bash
E2E_BASE_URL=https://staging.girob2b.com.br pnpm --filter @girob2b/web test:e2e
```

## Estrutura

```
tests/
├── README.md                    Este arquivo
└── e2e/
    ├── auth-validation.spec.ts  Validação client do cadastro + render do login
    └── explorar-public.spec.ts  Fluxo público de descoberta + páginas públicas
```

## O que é coberto hoje

- **Cadastro:** validação client-side (form vazio, senha curta, senhas divergentes, acentuação PT-BR).
- **Login:** render básico (campos, botões, OAuth, link para cadastro).
- **/explorar:** sugestões em estado vazio, click em sugestão preenche busca, empty state com query traz CTA pra Necessidades.
- **/produto/[slug]:** hero, CTAs, breadcrumb.
- **/fornecedor/[slug]:** garantia que hero + contato sempre renderizam (proteção contra perfil com layout vazio).
- **/painel/comparador:** redirect funcional.

## O que **não** é coberto (e por quê)

- **Submit final do cadastro** — depende de email confirmado por Supabase (rate limit + caixa real).
- **Login com senha real** — depende de seed de conta de teste no Supabase.
- **Criação de inquiry** — depende de sessão autenticada.
- **Pipeline / chat / propostas** — requer 2 sessões (buyer + supplier).

Para cobrir esses, próximo passo é criar `tests/.auth/` com sessão pré-salva (via `globalSetup`) usando uma conta seedada via `SUPABASE_SERVICE_ROLE_KEY` em ambiente de teste isolado.

## CI

Ainda sem pipeline configurado. Quando subir:
- Job: `next build` + `next start` em background, depois `playwright test`.
- Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` apontando pra projeto Supabase de teste.
- Artefatos: `playwright-report/` + `test-results/` (já no .gitignore).
