# Polish pré-lançamento — 2026-04-25

> Sequência executada após o UX audit, atacando bloqueadores críticos antes de seguir pra polish menor. Cada item rodou: análise → fix → validação visual/curl/type-check.

## ✅ Concluído

### #4 — Página `/painel/comparador` escondida (mockup era ruído)
- Sidebar já estava atrás de `FEATURES.comparador = false` ([lib/features.ts](../../apps/web/lib/features.ts)).
- Adicionado `redirect("/painel")` na page server-side ([app/(dashboard)/painel/comparador/page.tsx](../../apps/web/app/(dashboard)/painel/comparador/page.tsx)) — quem digitar a URL não cai mais no mockup.

### #9 — UX audit + 12 fixes consolidados
Audit em [`2026-04-25-ux-audit-app-web.md`](2026-04-25-ux-audit-app-web.md).
- 🔴 **C1** — Cookie banner reescrito: chip compacto bottom-right + modal central no "personalizar". Não cobre mais CTAs.
- 🔴 **C2/C3** — `normalizeLayout` em `/fornecedor/[slug]` força `hero` + `contact` sempre visíveis e mescla layout legado com `DEFAULT_LAYOUT` (blocks novos não somem).
- 🔴 **C4** — Validação de senha agora mostra erro inline (`.alert-error`) em vez de toast invisível.
- 🟠 **A1** — Acentos PT-BR corrigidos em `cookie-banner.tsx`, `buyer-register-form.tsx`, `register-modal.tsx`.
- 🟠 **A2** — `minLength`/`required` removidos dos inputs do cadastro; validação JS em PT-BR.
- 🟠 **A3** — `--font-mono` agora usa stack do sistema, sem ref a Geist (zero 404 de woff2).
- 🟠 **A5** — Botões inline migrados pra `.btn-primary`.
- 🟡 **M1** — `/recuperar-senha` agora usa `<GiroLogo variant="light" iconOnly>` no lugar do "G" plano.
- 🟡 **M2** — Placeholder do search encurtado pra "Buscar produtos ou fornecedores" + `aria-label` longo.
- 🟡 **M3** — `MVP_SCOPE.md` atualizado: T2-10 (Google) + T2-10b (Cert A1) marcados como entregues.
- 🟢 **B1** — Sidebar guest: 3 itens cadeados → card único "Disponível após entrar / Entrar →".

### #2 — Testes mínimos (Playwright)
- `apps/web/playwright.config.ts` (chromium + mobile-safari).
- `tests/e2e/auth-validation.spec.ts` — 7 testes: render, validações inline, ausência de mensagens em inglês, sentinelas de acentuação.
- `tests/e2e/explorar-public.spec.ts` — 7 testes: estado vazio com sugestões, click em sugestão, empty state com CTA pra needs, página pública de produto e de fornecedor (validando fix C2), redirect do comparador.
- `tests/README.md` documenta setup, comandos e o que **não** é coberto (signup completo + inquiry autenticada — depende de seed de conta).
- npm scripts: `test:e2e`, `test:e2e:ui`, `test:e2e:install`.
- `.gitignore` atualizado: `playwright-report/`, `test-results/`, `.playwright-mcp/`.

### #3 — Sentry (lazy, no-op se DSN ausente)
- `instrumentation.ts` (server + edge) e `instrumentation-client.ts` com import dinâmico via indireção de string — não quebra dev se pacote ainda não estiver instalado.
- `@sentry/nextjs` adicionado em `dependencies`.
- `.env.example` atualizado: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN/ORG/PROJECT`.
- Sem DSN configurado → no-op total (zero impacto em dev).

### #11 — Termos / Privacidade / FAQ
- `app/termos/page.tsx` — Termos de Uso (com dados reais da empresa: razão social + CNPJ).
- `app/privacidade/page.tsx` — Política de Privacidade alinhada à LGPD (com base no `4.4_COMPLIANCE_LGPD.md` da pasta foundational).
- `app/faq/page.tsx` — 12 perguntas frequentes do MVP.
- Links discretos no rodapé do `GuestShell` (Termos · Privacidade · FAQ).
- Cookie banner agora linka pra `/privacidade`.
- **Aviso explícito** em ambos os documentos: "pendente revisão jurídica formal".

### Smoke test final (curl)
12 rotas verificadas — todas verdes:
- Públicas: `/`, `/explorar`, `/cadastro`, `/login`, `/recuperar-senha`, `/termos`, `/privacidade`, `/faq`, `/produto/[slug]`, `/fornecedor/[slug]`.
- API: `/api/search/recent-needs`.
- Auth-gated: `/painel/comparador` (307 → confirma redirect).

## 🚧 Bloqueado por ambiente local — precisa do Vitor

### `npm install` em `apps/web/` falha com ENOTEMPTY
```
node_modules/.lightningcss-linux-x64-musl-qnstwHNJ
```
Esse diretório é dono `root:root` (deixado por sandbox de instalação anterior).
Resolver com:

```bash
cd apps/web
sudo rm -rf node_modules/.lightningcss-linux-x64-musl-*
npm install
npm run test:e2e:install   # baixa Chromium do Playwright
```

Depois disso:
- Testes Playwright passam a rodar (`npm run test:e2e`).
- Sentry fica funcional se `SENTRY_DSN` for setado.

### Migration 017 — coluna `user_profiles.can_use_web_search`
Aplicar no Supabase Dashboard → SQL Editor:

```sql
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS can_use_web_search BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_profiles.can_use_web_search IS
  'Feature flag — libera a "Pesquisa na web" para este usuário. Default false. Ver MVP_SCOPE.md T2-12.';
```

A tabela `search_needs` já está aplicada (verificado via service role).

## 🔜 Próximos passos sugeridos

Quando o ambiente estiver desbloqueado:

1. **Smoke E2E do fluxo de inquiry autenticado** — exige seed de conta de teste no Supabase + `globalSetup` no Playwright. ~2h.
2. **Configurar Sentry de verdade em produção** — criar projeto no Sentry, popular `SENTRY_DSN` em prod, validar via teste de erro proposital.
3. **Revisão jurídica dos Termos + Privacidade** — pendência marcada explicitamente nos documentos.
4. **CI mínimo** — pipeline rodando `npm run test:e2e` antes de cada deploy (alinhado com `MVP_SCOPE.md §8`).
5. **Limpeza dos 142 usages legacy `--brand-green-*`** — cosmético, baixa prioridade.

## Arquivos tocados nesta sessão (resumo)

```
apps/web/
├── app/
│   ├── (auth)/cadastro/buyer-register-form.tsx     [acentos + alert-error inline + .btn-primary]
│   ├── (auth)/recuperar-senha/page.tsx             [GiroLogo B3]
│   ├── (auth)/redefinir-senha/page.tsx             [gradient teal]
│   ├── (dashboard)/painel/comparador/page.tsx      [redirect]
│   ├── (dashboard)/painel/explorar/_components/explorer-search.tsx  [placeholder responsivo]
│   ├── (onboarding)/layout.tsx                     [gradient teal]
│   ├── api/search/recent-needs/route.ts            [novo, sessão anterior]
│   ├── faq/page.tsx                                [novo]
│   ├── fornecedor/[slug]/page.tsx                  [normalizeLayout merge + always-on hero/contact]
│   ├── globals.css                                 [Geist removido + alert utilities]
│   ├── privacidade/page.tsx                        [novo]
│   └── termos/page.tsx                             [novo]
├── components/
│   ├── auth/register-modal.tsx                     [acento]
│   ├── cookie-banner.tsx                           [reescrito + link privacidade]
│   └── layout/guest-shell.tsx                      [CTA único + footer legal]
├── instrumentation.ts                              [novo, Sentry lazy]
├── instrumentation-client.ts                       [novo, Sentry lazy]
├── playwright.config.ts                            [novo]
├── tests/e2e/auth-validation.spec.ts               [novo]
├── tests/e2e/explorar-public.spec.ts               [novo]
├── tests/README.md                                 [novo]
├── tsconfig.json                                   [exclude tests/]
├── .env.example                                    [Sentry vars]
├── .gitignore                                      [test artifacts]
└── package.json                                    [+ @sentry/nextjs, @playwright/test, scripts]

docs/
├── MVP_SCOPE.md                                    [T2-10 + T2-10b marcados como entregues]
└── _sessions/
    ├── 2026-04-25-ux-audit-app-web.md              [audit anterior]
    └── 2026-04-25-pre-launch-polish.md             [este]
```
