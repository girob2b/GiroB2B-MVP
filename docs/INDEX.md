# Índice da documentação — GiroB2B

Mapa de toda a doc do projeto. Atualizado em 2026-04-25.

> Convenção: docs **ativas** ficam diretamente em `docs/`; docs **fundacionais** (geradas em fase de planejamento, mantidas como referência) em `docs/foundational/`; **histórico de sessões** em `docs/_sessions/`; **marca** em `docs/brand/`.

---

## 🎯 Comece por aqui

| Doc | Para quê |
|---|---|
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Cores, tipografia, logo, componentes — fonte de verdade visual |
| [MVP_SCOPE.md](MVP_SCOPE.md) | Escopo operacional do MVP, tiers de feature, prioridades atuais |
| [brand/BRIEF_MARCA.md](brand/BRIEF_MARCA.md) | Posicionamento, tom, racional da paleta — o "porquê" do design |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Visão arquitetural curta (raiz do repo) |

---

## 🎨 Marca (`docs/brand/`)

| Doc | Conteúdo |
|---|---|
| [brand/BRIEF_MARCA.md](brand/BRIEF_MARCA.md) | Brief de identidade visual definitivo |
| [brand/pesquisa/mercado_visual.md](brand/pesquisa/mercado_visual.md) | Pesquisa visual de mercado B2B |
| [brand/pesquisa/tools_audit.md](brand/pesquisa/tools_audit.md) | Auditoria de ferramentas de design |
| [brand/pesquisa/skills_hunt.md](brand/pesquisa/skills_hunt.md) | Mapeamento de skills/competências de design |
| [brand/pesquisa/concepts/](brand/pesquisa/concepts/) | Variantes do logo geradas (B3 anel partido foi a vencedora) |

---

## 📋 Especificações técnicas (`docs/`)

| Doc | Conteúdo |
|---|---|
| [MVP_SCOPE.md](MVP_SCOPE.md) | Escopo do MVP — tiers, features ativas e gated |
| [WEB_SCRAPING.md](WEB_SCRAPING.md) | Spec da feature de pesquisa na web (T2-12) |
| [COTACOES_MODELO_PRODUTO_IA.md](COTACOES_MODELO_PRODUTO_IA.md) | Modelo de IA para cotações |
| [superpowers/specs/2026-04-11-revenda-produtos-design.md](superpowers/specs/2026-04-11-revenda-produtos-design.md) | Spec da feature de revenda de produtos |

---

## 🏛️ Documentação fundacional (`docs/foundational/`)

Doc gerada em fase de planejamento (2025/2026). **Não é atualizada ativamente** — serve como referência de decisões de origem. Para realidade atual, prefira `MVP_SCOPE.md` e o código.

### Fase 1 — Fundação
| | |
|---|---|
| `1.1_5W2H.md` | Análise estratégica 5W2H |
| `1.2_LEAN_CANVAS.md` | Lean Canvas |
| `1.3_BUSINESS_MODEL_CANVAS.md` | BMC detalhado |
| `1.4_REQUISITOS_FUNCIONAIS.md` | Requisitos funcionais MVP |
| `1.5_REQUISITOS_NAO_FUNCIONAIS.md` | Performance, segurança, escalabilidade |
| `1.6_REGRAS_DE_NEGOCIO.md` | Regras operacionais |
| `1.7_DEFINICAO_MVP_SCOPE_LOCK.md` | MVP scope lock formal *(≈ versão extensa do `MVP_SCOPE.md` ativo)* |
| `1.8_GLOSSARIO_DO_DOMINIO.md` | Glossário do domínio B2B |
| `1.9_JUSTIFICATIVA_DE_PRECIFICACAO.md` | Modelo de preços |

### Fase 2 — Modelagem
| | |
|---|---|
| `2.1_CASOS_DE_USO.md` | Casos de uso |
| `2.2_USER_STORIES.md` | User stories estruturadas |
| `2.3_STACK_TECNOLOGICO.md` | Stack + justificativas |
| `2.4_DIAGRAMA_DE_ARQUITETURA.md` | Diagrama de arquitetura |
| `2.5_ERD.md` | ERD completo |
| `2.6_DIAGRAMA_DE_CLASSES.md` | Diagramas OOP |
| `2.7_JORNADA_DO_COMPRADOR.md` | Jornada buyer |
| `2.8_JORNADA_DO_FORNECEDOR.md` | Jornada supplier |

### Fase 3 — Arquitetura
| | |
|---|---|
| `3.1_DIAGRAMA_DE_COMPONENTES.md` | Componentes do sistema |
| `3.2_DIAGRAMAS_DE_SEQUENCIA.md` | Sequências de interação |
| `3.3_MAPA_DE_INTEGRACOES.md` | Integrações de API |
| `3.4_PADROES_E_CONVENCOES.md` | Design patterns, naming |
| `3.5_FLUXOGRAMAS_DE_PROCESSOS.md` | Fluxos de negócio |
| `3.6_DICIONARIO_DE_DADOS.md` | Schema do banco |

### Fase 4 — Operacional
| | |
|---|---|
| `4.1_PROJECAO_DE_CUSTOS_OPERACIONAIS.md` | Custo-benefício operacional |
| `4.2_PROJECAO_FINANCEIRA_TECNICA.md` | Projeção financeira técnica |
| `4.3_POLITICA_DE_SEGURANCA.md` | Política de segurança, backups |
| `4.4_COMPLIANCE_LGPD.md` | LGPD, privacidade, legal |
| `4.5_ROADMAP_DE_DESENVOLVIMENTO.md` | Roadmap Q1–Q4 |

### Consolidado
| | |
|---|---|
| `REFERENCIA_CONSOLIDADA.md` | Sumário/índice da doc fundacional |

---

## 🕒 Histórico (`docs/_sessions/` e datados)

Logs de sessão e handoffs. **Não usar como fonte de verdade** — o código e os docs ativos sobrescrevem qualquer coisa aqui.

| Doc | Data |
|---|---|
| [AI_HANDOFF_2026-04-11.md](AI_HANDOFF_2026-04-11.md) | Handoff de IA (abr/2026) |
| [ux-audit-exhaustive-2026-04-19.md](ux-audit-exhaustive-2026-04-19.md) | UX audit completo |
| [ux-audit-screenshots/](ux-audit-screenshots/) | 18 screenshots do audit acima |
| [_sessions/2026-04-20-ui-ux-perfil-cotacoes.md](_sessions/2026-04-20-ui-ux-perfil-cotacoes.md) | Sessão UI/UX perfil + cotações |
| [_sessions/2026-04-20-ux-audit-fixes.md](_sessions/2026-04-20-ux-audit-fixes.md) | Sessão de fixes do audit |
| [_sessions/2026-04-25-ux-audit-app-web.md](_sessions/2026-04-25-ux-audit-app-web.md) | UX audit Playwright + 12 fixes |
| [_sessions/2026-04-25-ux-audit-screenshots/](_sessions/2026-04-25-ux-audit-screenshots/) | Screenshots audit + iterações de polish |
| [_sessions/2026-04-25-pre-launch-polish.md](_sessions/2026-04-25-pre-launch-polish.md) | Resumo das frentes de polish pré-lançamento |

---

## 📸 Screenshots de teste/debug — convenção

Toda screenshot tirada manualmente (Playwright MCP, debug visual, comparações antes/depois) **deve** ficar em:

```
docs/_sessions/<YYYY-MM-DD>-<tema>-screenshots/<nome-descritivo>.png
```

PNGs soltos na raiz do repo ou dentro de `apps/web/` são **bloqueados pelo `.gitignore`** — se aparecer um, mover pra pasta de screenshots da sessão correspondente. Screenshots **automatizados** dos specs Playwright vão pra `test-results/` (ignorado pelo git).

---

## 📦 Onde mais existe doc

| Lugar | O que tem |
|---|---|
| `apps/web/README.md` | Stack + scripts do app web (Next.js) |
| `apps/web/AGENTS.md` | Aviso pra agentes IA: este Next.js tem breaking changes |
| `apps/girob2b-landing-page/README.md` | Stack + estrutura da landing page |
| `apps/girob2b-landing-page/src/styles/tokens.css` | Tokens visuais raw da landing |
| `apps/web/app/globals.css` | Tokens visuais raw do app web |

---

## 🧭 Convenções de manutenção

- **Atualizar `DESIGN_SYSTEM.md`** quando introduzir token/componente novo de uso recorrente.
- **Atualizar `MVP_SCOPE.md`** quando promover feature de gated → ativa, ou ajustar tier.
- **Não editar `foundational/*`** — esses docs são snapshot de planejamento. Se o sistema divergiu, o código é a verdade; abra um doc novo ou ajuste o `MVP_SCOPE.md`.
- **Sessões** ficam em `_sessions/YYYY-MM-DD-tema.md`. Datadas. Servem só pra contexto histórico.
- **Brand assets** (PNG, SVG, AI) ficam em `brand/` ou `brand/pesquisa/concepts/`.
