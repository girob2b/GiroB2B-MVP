# GiroB2B — Release Process & Quality Gates

> Fonte de verdade do fluxo desenvolvimento → teste → deploy.
> Todas as decisões aqui são trancadas — alterar requer PR com justificativa.

Criado: 2026-05-23. Última revisão: 2026-05-23.

---

## 1. Princípios

1. **Trunk-based.** `main` é a fonte de verdade. Feature branches são curtas (1-3 dias máximo).
2. **Auto-deploy de main.** Vercel deploya tudo que cai em main. Por isso, **main não pode receber código quebrado**.
3. **PR obrigatório.** Push direto em main bloqueado por branch protection. Inclui você (solo dev).
4. **Preview = staging.** Cada PR ganha URL Vercel própria pra validação visual. Não precisamos de branch `staging` separada.
5. **Rollback é Git.** `git revert` + push é o caminho. Não fazemos "rollback no painel Vercel" pra evitar dessincronizar Git vs produção.
6. **Quality gates locais primeiro.** Husky pega problemas no commit — feedback em 10s, não 3 min de CI.

---

## 2. Branch strategy

### 2.1 Branches permanentes

| Branch | Função | Proteção | Deploy |
|---|---|---|---|
| `main` | Produção | Branch protection ON. Merge só via PR com CI verde. | Auto (Vercel → `app.girob2b.com.br` + `admin.girob2b.com.br` + `girob2b.com.br`) |

### 2.2 Branches temporárias

| Prefixo | Quando criar | Lifespan | Exemplo |
|---|---|---|---|
| `feature/<slug>` | Nova feature ou melhoria | 1-3 dias máx | `feature/comparador-cotacoes` |
| `fix/<slug>` | Correção de bug não-urgente | 1-2 dias | `fix/login-prefill-email` |
| `hotfix/<slug>` | Produção quebrada AGORA | <1 dia | `hotfix/pagamento-loop-erro` |
| `chore/<slug>` | Deps, CI, refactor sem feature | 1 dia | `chore/atualizar-pnpm` |
| `docs/<slug>` | Só documentação | 1 dia | `docs/release-process` |

**Naming:** kebab-case, descritivo, sem prefixo de ticket (não temos issue tracker formal ainda).

### 2.3 Por que não tem `develop`/`staging`

Conscientemente removida. Razões:

- **Solo dev.** Branch separada de integração só faz sentido com múltiplos PRs concorrentes esperando QA.
- **Preview Vercel já é staging.** Cada PR gera URL própria — validação visual sem branch dedicada.
- **Menos contexto pra gerenciar.** Sync `develop → main` periódica vira tarefa burocrática que decai.
- **Quando reavaliar:** quando tivermos 2+ devs ativos e/ou QA dedicado.

---

## 3. Fluxo de release

### 3.1 Feature normal (90% dos casos)

```
1. git checkout main && git pull
2. git checkout -b feature/<slug>
3. Mexer no código
4. git add ... && git commit -m "..."
   ├─ Husky pre-commit roda lint-staged
   ├─ eslint --fix + tsc nos arquivos staged
   └─ Falha = commit bloqueado, sem ir pra origem
5. git push -u origin feature/<slug>
6. gh pr create  (ou GitHub UI)
   ├─ PR template aparece com checklist
   └─ Vercel cria preview deploy automático
7. Aguardar CI verde (~3 min)
8. Abrir preview URL, validar visualmente
9. Self-approve (solo dev) ou pedir review (quando tiver time)
10. Merge via GitHub UI ("Squash and merge" — histórico limpo)
11. Vercel deploya main → produção (~2 min)
12. Deletar branch local + remota
```

### 3.2 Hotfix de produção

Produção quebrada (login não funciona, dados sumindo, página em branco). Cada minuto custa.

```
1. git checkout main && git pull
2. git checkout -b hotfix/<slug>
3. Fix MÍNIMO. Sem refactor, sem cleanup. Só o necessário.
4. Commit (husky valida)
5. Push + PR
6. CI verde? Auto-merge OK.
7. Vercel deploya
8. Investigar root cause em separado (issue / nota AVISOS.md)
```

**Regra:** hotfix não acumula. Se a feature/X branch precisa do mesmo fix, faça cherry-pick depois — não espere o hotfix.

### 3.3 Rollback

Bug entrou em produção, precisa voltar agora.

```
1. Identificar commit problemático (git log main)
2. git checkout main && git pull
3. git revert <sha>           # cria commit que desfaz mudança
4. git push origin main       # branch protection libera direto pra commits de revert?
```

Se branch protection bloquear push direto em main mesmo pra revert (que é o esperado):

```
3. git checkout -b hotfix/revert-<slug>
4. git revert <sha>
5. git push + PR + merge fast-track
```

**Por que `git revert` e não rollback no Vercel:**

- Vercel "Promote to Production" de deploy antigo **não atualiza o Git** — Git vs produção desincronizam, próximo merge sobrescreve a "correção".
- `git revert` deixa a história limpa e auditável.
- Tempo total até produção: ~2 min (mesmo do Vercel UI).

### 3.4 Hotfix que precisa **bypass** total

Apenas em caso extremo (produção totalmente fora, dados sendo perdidos): admin do repo pode dar override em branch protection no GitHub. Documentar no AVISOS.md por que foi necessário.

---

## 4. Versionamento (tags) — opcional mas recomendado

Não usamos pipeline complexa de release. Mas marcar pontos estáveis ajuda:

```
git tag v0.1.0
git push origin v0.1.0
```

**Quando taggar:**
- Marco de produto (waitlist público → MVP fechado → MVP aberto)
- Antes de mudanças arriscadas (refactor grande, migração de schema)
- Toda sexta-feira em produção estável (release semanal opcional)

**Schema:** `vMAJOR.MINOR.PATCH`
- MAJOR — mudança de produto (reverse marketplace → algo diferente)
- MINOR — feature nova significativa
- PATCH — fix, ajuste menor

**O que tags nos dão:**
- Rollback target: `git checkout v0.1.0` quando precisa investigar regressão
- Histórico de marcos no GitHub Releases (quando publicar release notes)

---

## 5. Quality gates

### 5.1 Pre-commit (Husky + lint-staged)

Roda automaticamente em todo `git commit`. Bloqueia se falhar.

**O que roda:**
1. `eslint --fix` nos arquivos `.ts/.tsx/.js/.jsx` staged
2. `tsc --noEmit` no workspace correspondente (só se arquivos `.ts/.tsx` mudaram nele)
3. Lint de markdown nos `.md` mudados (verifica links quebrados internamente — V2)

**Setup:** raiz tem `package.json` com `husky` + `lint-staged`. Hook em `.husky/pre-commit`. Config em `.lintstagedrc.json`.

**Skip de emergência:** `git commit --no-verify`. **Só use** se a alternativa é não conseguir commitar nada (ex: hook quebrado). Documenta em AVISOS.md o motivo.

### 5.2 CI (GitHub Actions)

Roda em todo PR + todo push pra main. Branch protection exige verde antes do merge.

**Jobs configurados:**

| Job | O que faz | Bloqueia merge? |
|---|---|---|
| `web (type-check + lint + build)` | `pnpm --filter @girob2b/web exec tsc --noEmit && eslint && next build` | Sim |
| `admin (type-check + lint)` | `pnpm --filter @girob2b/admin exec tsc --noEmit && eslint` | Sim |
| `landing (type-check + build)` | `pnpm --filter landing-page exec tsc -b && vite build` | Sim |
| `design-system (type-check)` | `pnpm --filter @girob2b/design-system exec tsc -b` | Sim |
| `e2e (Playwright)` | Sub-suite de smoke crítica nos 7 fluxos | Sim (depois que suite estabilizar) |

`e2e` começa como **opcional** (não bloqueia merge) até a suite ficar estável. Depois vira mandatory.

### 5.3 Branch protection rules (GitHub UI)

**Repo:** `girob2b/GiroB2B-MVP` (mesma config replicada em `girob2b/girob2b-landing-page`).

Settings → Branches → main → Protect this branch:

- ✅ Require a pull request before merging
- ✅ Require approvals: 0 (solo dev — depois aumenta)
- ✅ Dismiss stale approvals when new commits are pushed
- ✅ Require status checks to pass before merging:
  - `web (type-check + lint + build)`
  - `admin (type-check + lint)`
  - `landing (type-check + build)`
  - `design-system (type-check)`
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings (mesmo pra admins) — desativa pra você ter override de emergência
- ✅ Restrict pushes that create matching branches: bloqueia force push em main

**Status:** configurar manual após primeiro merge dos quality gates.

### 5.4 PR template

`.github/pull_request_template.md` aparece automaticamente ao abrir PR. Checklist:

- [ ] Tipo: feature / fix / hotfix / chore / docs
- [ ] Linkar AVISOS.md relacionado (se aplicável)
- [ ] Smoke test no preview URL (cole URL)
- [ ] Atualizou doc se mudou contrato (`docs/`, `ARCHITECTURE.md`, `MVP_PIVOT_*.md`)
- [ ] Adicionou entry em AVISOS.md se ficou pendência

---

## 6. Convenções de commit

Padrão: **Conventional Commits** simplificado.

```
<tipo>(<escopo>): <descrição curta no imperativo>

[corpo opcional explicando "por quê"]
```

**Tipos:**

| Tipo | Quando |
|---|---|
| `feat` | Feature nova |
| `fix` | Correção de bug |
| `refactor` | Mudança de código sem mudar comportamento |
| `chore` | Tooling, deps, CI |
| `docs` | Só documentação |
| `style` | Formatação, indentação |
| `test` | Adicionar/atualizar testes |
| `perf` | Otimização de performance |

**Escopos comuns:**

| Escopo | Onde |
|---|---|
| `auth` | login/cadastro/recuperar-senha |
| `waitlist` | landing modal + admin queue |
| `demands` | publicar / listar / detalhar necessidades |
| `admin` | painel admin |
| `ds` | design system |
| `layout` | shells, navbar, footer |
| `home` | raiz do app/web |
| `landing` | apps/girob2b-landing-page |
| `web` | apps/web em geral |
| `infra` | CI, deploy, supabase migrations |

**Co-Authored-By:** todo commit gerado por mim (Vex/Claude) leva trailer `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` — pra você auditar contribuição.

---

## 7. Convenções de PR

**Título:** mesmo formato do commit (`<tipo>(<escopo>): <desc>`).

**Corpo:**

```markdown
## Resumo
- bullet 1
- bullet 2

## Por quê
1 parágrafo explicando motivação.

## Como testar
- [ ] passo 1
- [ ] passo 2

## Screenshots / preview
[preview URL Vercel]

## Pendências (se houver)
- [ ] item
```

**Tamanho ideal:** <400 linhas modificadas. PRs maiores → quebrar em commits atômicos no mesmo PR, ou em PRs encadeados.

**Merge strategy:** **Squash and merge** sempre. Razões:
- Histórico de `main` fica limpo (1 commit por feature)
- Fica fácil de reverter via `git revert <merge-sha>`
- Detalhes do desenvolvimento ficam preservados no PR closed

---

## 8. Decisões trancadas (não mexer sem PR de justificativa)

1. **Trunk-based em vez de gitflow.** Justificativa: solo dev, preview Vercel já é staging.
2. **Auto-deploy de main.** Justificativa: MVP em validação, velocidade > controle granular.
3. **Branch protection mesmo pro solo dev.** Justificativa: rede de segurança contra erro próprio.
4. **Husky bloqueante (não warning).** Justificativa: commit quebrado vira PR quebrado vira CI vermelho — corta no lugar mais barato.
5. **Squash and merge.** Justificativa: histórico de main limpo.
6. **Sem release notes automatizadas (V1).** Justificativa: overkill antes do go-live. V2 quando tiver usuários.
7. **`develop`/`staging` rejeitada (V1).** Justificativa: solo dev. Reavaliar com 2+ devs.

---

## 9. O que NÃO está coberto (e por quê)

- **Release notes automatizadas** — V2. Hoje commit history + PRs servem.
- **CI: testes Playwright bloqueantes** — começa opcional. Promove a obrigatório quando suite estabilizar.
- **Canary deploys / feature flags** — overkill antes de tráfego real. V2 com Vercel Rolling Releases ou similar.
- **Code coverage gate** — V2. Hoje 0 testes unitários significativos.
- **Dependabot / Renovate** — V2. Sweep manual semanal por enquanto.
- **Storybook formal** — substituído por `apps/design-system` (mini-site local).
- **Multi-environment (dev/staging/prod separados)** — produção atual já é "dev em público". V2 quando tiver usuários reais.

---

## 10. Setup inicial (one-time)

Operador (Vitor) precisa fazer **uma vez** no GitHub UI:

1. **`girob2b/GiroB2B-MVP` → Settings → Branches → Add rule** com config da seção 5.3
2. **`girob2b/girob2b-landing-page` → Settings → Branches → Add rule** idem
3. **Vercel → Project Settings → Git → Production Branch = main** (já está)
4. **Vercel → Project Settings → Git → Auto Deploy = enabled em main** (já está)
5. **Confirmar comentário de preview do Vercel ativo nos PRs** (Project Settings → Git → "Comment on Pull Requests")

Pendência inicial registrada em [AVISOS.md](../AVISOS.md).

---

## 11. Como testar este processo (primeira vez)

1. Esta refatoração entrou direto em main (one-shot — ainda sem branch protection ativa)
2. Próxima mudança: **abra PR**. Confirme:
   - CI roda (`web`, `admin`, `landing`, `design-system`)
   - Vercel posta preview URL no PR
   - Husky bloqueia commit com type error
3. Ative branch protection (seção 10)
4. Próxima mudança após isso: push direto em main deve ser bloqueado pelo GitHub
5. Documenta primeiro hotfix real (se necessário) — pra calibrar SLA
