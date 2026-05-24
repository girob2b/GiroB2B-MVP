# Workflow — UX Audit → Implementação

> Como a Vex usa a skill `ux-audit` (read-only) e quem implementa as melhorias sugeridas.
> Decisão tomada 2026-05-23 (Vitor).

---

## 1. Princípio

**`ux-audit` é skill read-only.** Produz relatório com sugestões ranqueadas por severidade — **nunca altera código**. Quem implementa as sugestões é o agente **frontend**, invocado via skill **`squad-dev`** (ou `dev-flow`).

Separa quem **vê** o problema de quem **resolve** — evita que a mesma sessão acumule contexto de auditoria + implementação (que costuma virar refactor descontrolado).

---

## 2. Fluxo canônico

```
1. Vitor pede:
   "rode ux-audit na tela X"

2. Vex invoca a skill ux-audit
   ├── Dogfood como persona definida (default: comprador anônimo)
   ├── Navega, screenshota, conta cliques
   ├── Testa resiliência (back, refresh, mid-form)
   └── Gera relatório em:
       docs/_sessions/<YYYY-MM-DD>-ux-audit-<tema>/
         ├── REPORT.md         (findings ranqueadas)
         └── screenshots/      (anexos)

3. Vex apresenta o relatório a Vitor
   ├── Top 3-5 findings críticos/altos
   ├── "Uma coisa pra resolver primeiro"
   └── Aguarda decisão

4. Vitor escolhe quais findings implementar
   "implementa os 3 críticos"
   ou
   "só o #1, os outros eu vejo depois"

5. Vex invoca squad-dev passando os findings selecionados
   ├── squad-dev dispara dev-senior-fullstack ou
   │   dev-frontend (drill-down) com contexto do relatório
   ├── Plano + implementação + commit (via release-process)
   └── PR aberto com link de volta pro relatório

6. Vex confirma com Vitor antes de mergear
```

---

## 3. O que `ux-audit` NÃO faz

- ❌ Não roda `Edit`, `Write`, `Bash` em arquivos do projeto
- ❌ Não cria branches, não commita
- ❌ Não invoca dev-* agents direto
- ❌ Não "deixa rolando" implementação enquanto continua auditando

**Única coisa que cria:** o diretório `docs/_sessions/<YYYY-MM-DD>-ux-audit-<tema>/` com o REPORT.md + screenshots. Tudo que entra ali é leitura/diagnóstico, não código de produto.

> `docs/_sessions/` já está no [`.gitignore`](../../.gitignore) — relatórios e screenshots não vão pro git. São artefato de sessão, não documento canônico. Se algum finding merecer virar doc permanente (ex: critério de aceite, padrão de UX), promover pra `docs/` propriamente.

---

## 4. Quando usar `ux-audit`

| Cenário | Depth |
|---|---|
| Mudei uma tela, quero sanity check rápido | `quick` (5-10 min) |
| Vou demo pro Gustavo / investidor | `standard` (20-40 min) |
| Pré-launch público — sweep completo | `thorough` (overnight) |
| Cliente novo / regressão em fluxo crítico | `thorough` ou `exhaustive` |

---

## 5. Quando usar `squad-dev` em vez

`squad-dev` (ou `dev-flow`) é o caminho de **implementação**. Use quando:

- Já tem relatório `ux-audit` em mãos e Vitor aprovou X findings
- Tem brief técnico claro (não diagnóstico)
- Vai mudar código

**Não confunda:** se for diagnóstico ("o que tá ruim aqui?"), é `ux-audit`. Se for execução ("implementa essa lista"), é `squad-dev` / `dev-flow`.

---

## 6. Handoff entre os dois

Quando Vex passa do `ux-audit` pro `squad-dev`, o prompt do squad-dev deve:

1. Apontar pro REPORT.md específico (caminho relativo)
2. Listar quais findings vão entrar nessa rodada (IDs ou títulos)
3. Quais ficam pra próxima (e por quê)
4. Eventuais restrições de escopo (ex: "não mexer no header agora")

Exemplo:

```
Vex → squad-dev:
  "Implementar findings #1, #3 e #5 do
   docs/_sessions/2026-05-23-ux-audit-home-guest/REPORT.md
   (severities critical + high).
   Finding #2 fica pra próxima — depende de decisão de preço da assinatura.
   Não tocar no fluxo /postar nesta rodada — coberto em PR #3 aberto."
```

---

## 7. Por que essa separação

1. **Foco.** Auditoria precisa de mindset "fresh eyes" — implementação precisa de mindset "como construir corretamente". Misturar os dois degrada ambos.
2. **Granularidade da decisão.** Vitor escolhe O QUE implementar antes da Vex partir pra codar. Sem isso, vira PR gigante com 12 mudanças misturadas.
3. **Auditoria.** Relatório fica como artefato — fácil revisitar "o que decidimos não fazer e por quê".
4. **Histórico.** Cada finding tem um momento (relatório) e uma resolução (PR ou nota "fora de escopo"). Linha do tempo clara.

---

## 8. Anti-padrões

- ❌ **Vex auditando + corrigindo no mesmo turno.** Vira retrabalho — auditoria fica superficial pq a cabeça já tá no "como resolver".
- ❌ **Pedir `ux-audit` esperando código no fim.** É só relatório. Implementação é passo separado.
- ❌ **`squad-dev` partir pra dev sem ler o REPORT.md citado.** Contexto vem do relatório, não do prompt curto da Vex.
- ❌ **Sessão acumulando 10 ux-audits sem implementação.** Findings envelhecem. Resolver findings críticos do anterior antes de auditar nova tela.

---

## 9. Hooks removidos

Em 2026-05-23 foi removido do `~/.claude/settings.json` o hook **"MENZINHO ATIVADO"** que injetava um protocolo de revisão code-review em qualquer prompt com palavras "revisão", "auditoria", "análise" em projetos `girob2b`. Razão: estava confundindo skills genuínas (ux-audit, qa-tester) com seu próprio protocolo, sem definição canônica em lugar acessível.

**O que vale a partir de agora:**
- `ux-audit` = read-only, produz relatório
- `squad-dev` / `dev-flow` = implementação, abre PR
- `qa-tester` = bateria de testes (Playwright etc), produz bug report
- Nenhum desses precisa de "ativação" extra via hook
