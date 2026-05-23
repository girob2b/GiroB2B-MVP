<!--
  GiroB2B — PR Template
  Doc canônico: docs/release-process.md
  Convenção: <tipo>(<escopo>): <descrição> no título (ver §6 do doc)
-->

## Tipo

<!-- Marque apenas um -->

- [ ] `feat` — feature nova
- [ ] `fix` — bug não-urgente
- [ ] `hotfix` — produção quebrada agora
- [ ] `refactor` — sem mudança de comportamento
- [ ] `chore` — tooling / deps / CI
- [ ] `docs` — só documentação
- [ ] `perf` — otimização
- [ ] `test` — testes

## Resumo

<!-- 2-4 bullets do que mudou. Foco no QUÊ e POR QUÊ, não no como. -->

-
-

## Contexto

<!-- 1 parágrafo opcional: contexto de produto/negócio, link pra AVISOS.md
     ou docs/casos-de-uso.md se aplicável. -->

## Como testar

<!-- Passos concretos pra reproduzir no preview Vercel. -->

- [ ] passo 1
- [ ] passo 2
- [ ] passo 3

## Preview

<!-- URL do Vercel preview deploy (o bot do Vercel posta automaticamente; cole aqui pra registro). -->

🔗

## Screenshots

<!-- Antes/depois se for mudança visual. Suprima a seção se não aplica. -->

## Checklist

- [ ] Husky validou o commit local (lint + tsc passou)
- [ ] CI verde (`web`, `admin`, `design-system`, `e2e`)
- [ ] Smoke test no preview Vercel
- [ ] Atualizei doc se mudei contrato (`docs/`, `ARCHITECTURE.md`, `MVP_PIVOT_*.md`, `docs/release-process.md`)
- [ ] Adicionei entry em AVISOS.md se ficou pendência ou bloqueador

## Pendências (se houver)

<!-- O que NÃO entrou neste PR e por quê. Vincular AVISOS.md se for criar entry. -->

-
