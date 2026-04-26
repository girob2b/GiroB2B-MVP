# Skill hunt — GiroB2B Logo

> Track C da pesquisa logo (17/04). Busca skills publicas em skills.sh pra logo/brand/design research.

## TL;DR

**Nenhuma skill nova a instalar agora.** Skills publicas de logo-design ou assumem flat-minimalista (oposto do alvo 3D cinematografico Warner) ou sao prompt-wrappers genericos sem diferencial sobre o que ja temos. Skills ja instaladas (`marketing-psychology`, `copywriting`, `brand-voice-enforcement`, `frontend-design`, `gemini-vertex-imagegen`) cobrem o caso melhor quando combinadas com outputs dos Tracks A/B.

**Revisitar pos-Bloco 3:** `rknall/claude-skills@svg-logo-designer` (1.2K installs, 38 stars) e util pra Fase 4 finalizacao — converter conceito aprovado em SVG vetor limpo. Adiar pra nao enviesar pipeline cedo.

## Queries executadas

1. `npx skills find "logo design"`
2. `npx skills find "brand identity"`
3. `npx skills find "visual identity"`
4. `npx skills find "design research"`
5. `npx skills find "brand research"`

## Candidatas avaliadas

### Rejeitadas

| Skill | Installs | Motivo de rejeicao |
|-------|----------|---------------------|
| `inference-sh/skills@logo-design-guide` | 237 | Explicitamente contra 3D/photorealistic. Recomenda so flat/geometric. Diretamente oposto ao alvo Warner Bros volumetrico. |
| `referodesign/refero_skill@refero-design` | 1.3K | Metodologia de pesquisa solida (4 fases) mas **web UI only**, nao brand/logo. Requer Refero MCP externo. |
| `travisjneuman/.claude@brand-identity` | 384 | Sem SKILL.md em skills.sh. Capability obscura. |
| `eddiebe147/claude-settings@logo ideator` | 61 | Install count muito baixo. |
| `guia-matthieu/clawfu-skills@audio-logo-design` | 55 | Audio (jingle), fora de escopo. |

### Adiadas (possivel uso futuro)

| Skill | Installs | Fase de uso potencial |
|-------|----------|------------------------|
| `rknall/claude-skills@svg-logo-designer` | 1.2K | **Bloco 4 finalizacao** — converter conceito 3D aprovado em SVG limpo. SVG handcrafted e flat por natureza, entao serve so apos ter conceito raster aprovado. |
| `motion-team/creative-strategy-skills@brand-intake` | 119 | **Bloco 1 intake** — se precisarmos de estrutura formal de briefing. Install count baixo (<200) desestimula. |
| `daffy0208/ai-dev-standards@brand-designer` | 766 | **Bloco 1/3** — nao inspecionada em detalhe. Avaliar se pipeline custom nao convergir. |

## Skills ja instaladas que cobrem o caso

| Skill | Bloco de uso |
|-------|---------------|
| `marketing-psychology` | Bloco 1 — personalidade, tom emocional, target emotional tone |
| `copywriting` | Bloco 1 — positioning statement, brand tagline, headline |
| `brand-voice-enforcement` | Pos-logo — aplicar voz da marca em social/LinkedIn/email |
| `frontend-design` | Avaliacao de qualidade visual em cada iteracao (geral) |
| `gemini-vertex-imagegen` | Pipeline geracao (Bloco 4) — **precisa adaptacao** pra `--reference` / `--iteration-mode` / `--style-ref` |

## Decisao

Seguir sem install novo. Pipeline:
1. **Bloco 1 (fundamentos):** thread principal + `marketing-psychology` + `copywriting`
2. **Bloco 2 (pesquisa):** outputs Tracks A (`tools_audit.md`) + B (`mercado_visual.md`)
3. **Bloco 3 (forma+estilo):** brief estruturado com base em Bloco 1+2
4. **Bloco 4 (pipeline):** `gemini-vertex-imagegen` adaptado + **possivel install de `svg-logo-designer` pra finalizacao vetor**

## Fontes

- skills.sh leaderboard: https://skills.sh/
- rknall SVG Logo Designer: https://skills.sh/rknall/claude-skills/svg-logo-designer
- inference-sh Logo Design Guide: https://skills.sh/inference-sh/skills/logo-design-guide
- Refero Design: https://skills.sh/referodesign/refero_skill/refero-design
- travisjneuman brand-identity: https://skills.sh/travisjneuman/.claude/brand-identity
- Motion team brand-intake: https://skills.sh/motion-team/creative-strategy-skills/brand-intake
