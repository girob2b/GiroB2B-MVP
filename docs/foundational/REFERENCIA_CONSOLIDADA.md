# Referência Consolidada — GiroB2B

**Propósito:** Índice vivo de todas as decisões, códigos e definições da documentação técnica. Consultar ANTES de criar cada novo artefato para garantir coerência.
**Última atualização:** 06/04/2026 (Fase 1 completa + Fase 2 COMPLETA: artefatos 2.1 a 2.8 + Fase 3 COMPLETA: artefatos 3.1, 3.2, 3.3, **3.4**, **3.5** e **3.6** + Fase 4 COMPLETA: **4.1 rev.1.1** + **4.2 Projeção Financeira** + **4.3 Política de Segurança** + **4.4 Compliance LGPD** + **4.5 Roadmap de Desenvolvimento** + **Decisão Cadastro Unificado MVP** — §17 #13-15 + **§20 atualizada: créditos cloud US$9.300 potenciais** + **Correções de coerência: §22 SP 154→153/258→257, §29 MON 22→23**)

---

## 1. Identidade do projeto

- **Nome:** GiroB2B
- **Tipo:** Marketplace B2B horizontal de conexão/leads (NÃO transacional)
- **Modelo:** Freemium. Fornecedores listam grátis, pagam assinatura para acessar leads. Compradores nunca pagam.
- **Referência:** IndiaMART (Índia) — 8,4M suppliers, 220K pagantes, receita ₹1.388 crores/ano (~R$775M), EBITDA 40%
- **Posicionamento:** "O IndiaMART do Brasil"
- **Sem:** comissão, estoque, logística (asset-light)

---

## 2. Dados da empresa

| Campo | Valor |
|---|---|
| Razão social | GIROB2B PLATAFORMA DE NEGOCIOS DIGITAIS INOVA SIMPLES (I.S.) |
| CNPJ | 65.542.877/0001-50 |
| Regime | Inova Simples |
| Abertura | 07/03/2026 |
| CNAE principal | 6319-4/00 (Portais e provedores de conteúdo na Internet) |
| CNAE secundário | 7490-1/04 (Intermediação de serviços e negócios) |
| Integrantes formais | Gustavo (CEO, 45%), Vitor Barreto (CTO, 45%) |
| Co-founder informal | Márcio (CCO, 10% equity, MEI próprio, NÃO no CNPJ) |
| Site | girob2b.com.br |
| LinkedIn | linkedin.com/company/girob2b |

---

## 3. Equipe e responsabilidades

| Pessoa | Cargo | Faz o quê |
|---|---|---|
| Gustavo | CEO | Estratégia, produto, gestão, documentação |
| Vitor Barreto | CTO | Tecnologia, arquitetura, dev full-stack |
| Márcio | CCO | Campo, parcerias, onboarding presencial em SP |

---

## 4. Planos de assinatura

| Plano | Código | Mensal | Anual | Leads/sem | Custo/lead | Diferenciais |
|---|---|---|---|---|---|---|
| Gratuito | `free` | R$0 | R$0 | 0 | — | Listagem ilimitada, perfil público, recebe inquiries (sem dados de contato) |
| Giro Starter | `starter` | R$79 | R$790 | 5 | ~R$3,95 | CRM básico, analytics de perfil |
| Giro Pro | `pro` | R$199 | R$1.990 | 15 | ~R$3,32 | Selo Verificado, CRM completo, WhatsApp |
| Giro Premium | `premium` | R$399 | R$3.990 | 30+ | ~R$3,33 | Prioridade na busca, domínio personalizado, vídeos, suporte dedicado |

- **Desconto anual:** ~17% (equivale a 2 meses grátis)
- **ARPU estimado (Ano 1):** R$1.440 a R$1.800/ano (maioria Starter + alguns Pro; detalhamento em 1.9 seção 7.3)
- **Conversão projetada:** 2-3% (benchmark IndiaMART: 2,6%)
- **Créditos semanais expiram domingo 00:01 (não acumulam)**
- **Créditos extras avulsos:** validade 90 dias

---

## 5. Cronograma / Roadmap

| Fase | Período | Metas principais |
|---|---|---|
| Fundação (MVP) | Meses 1-3 (abr-jun/2026) | MVP funcional, SEO, 500-1.000 fornecedores |
| Validação | Meses 4-6 (jul-set/2026) | Inquiries, métricas, 2.000-3.000 fornecedores |
| Monetização | Meses 7-9 (out-dez/2026) | Planos pagos, gateway, R$5K-15K/mês |
| Tração | Meses 10-12 (jan-mar/2027) | PWA, IA matchmaking, 10K+ fornecedores |
| Escala | Meses 13-18 (abr-set/2027) | Nacional, 30K+ fornecedores, R$100K-300K/mês |

---

## 6. Stack tecnológico (detalhado no artefato 2.3)

| Camada | Tecnologia | Versão (abr/2026) | Custo MVP |
|---|---|---|---|
| Linguagem | TypeScript | 6.0 | R$0 |
| Framework full-stack | Next.js (React) | 16.2 | R$0 |
| Estilização | Tailwind CSS | 4.2 | R$0 |
| Runtime back-end | Node.js (⚠️ recomendado; Vitor decide) | 24 LTS | R$0 |
| Banco de dados | PostgreSQL (via Supabase) | 15+ | R$0 → $25/mês |
| Auth + Storage + Realtime | Supabase | — | Incluso |
| Deploy front-end | Vercel | — | R$0 → $20/mês |
| Deploy back-end | Railway | — | R$0-5/mês |
| CDN + Segurança + DNS | Cloudflare | — | R$0 |
| Email transacional | Resend | — | R$0 (3K/mês) |
| Error tracking | Sentry | — | R$0 (5K errors/mês) |
| Analytics | PostHog | — | R$0 (1M events/mês) |
| Uptime monitoring | Better Stack | — | R$0 |
| Versionamento + CI/CD | GitHub + GitHub Actions | — | R$0 |
| Mobile | PWA (nativo Next.js) | — | R$0 |

**Custo MVP total:** R$0 a ~$50/mês | **Créditos cloud:** ~US$2.300 aprovados

---

## 7. Verticais prioritárias (Go-to-Market)

1. **Indústria/Manufatura** — rede do Márcio (⚠️ subsetores pendentes)
2. **Embalagens** — toda empresa precisa, alta recorrência
3. **Alimentos e bebidas** — insumos industriais
4. **Materiais de construção** — setor R$100B+/ano
5. **Têxtil e confecção** — polos: Brás/SP, Caruaru/PE, Cianorte/PR
6. **Autopeças** — fragmentado, alta demanda online

---

## 8. Atores do sistema

| Ator | Código | Nível | Descrição |
|---|---|---|---|
| Usuário | `user` | 1 | Cadastro base. Navega, busca, vê catálogo. Não pode enviar inquiry nem listar produtos. |
| Comprador | `buyer` | 2 | Ativado na primeira inquiry (aceita LGPD). Envia inquiries, recebe propostas. CNPJ opcional (selo). |
| Fornecedor | `supplier` | 3 | Upgrade voluntário (CNPJ obrigatório + endereço). Lista produtos, recebe leads, paga para acessar. |
| Admin | `admin` | — | Equipe GiroB2B. Back-office, moderação, analytics. |

> **Dual-role:** Uma conta pode ter registros em `buyers` E `suppliers` simultaneamente. Role derivado em runtime.
> **Decisão (04/04/2026):** Cadastro unificado com progressão por engajamento — ver §17 #13-15.

---

## 9. Índice de Requisitos Funcionais (RF)

### Legenda de fases
- **M** = MVP | **V** = Validação | **$** = Monetização | **E** = Escala

### Por módulo

| Módulo | Códigos | Qtd MVP | Qtd total |
|---|---|---|---|
| 01 — Cadastro e Autenticação | RF-01.01 a RF-01.17 | 15 | 17 |
| 02 — Perfil do Fornecedor | RF-02.01 a RF-02.07 | 5 | 7 |
| 03 — Catálogo de Produtos | RF-03.01 a RF-03.07 | 6 | 7 |
| 04 — Busca e Descoberta | RF-04.01 a RF-04.08 | 5 | 8 |
| 05 — SEO Programático | RF-05.01 a RF-05.09 | 9 | 9 |
| 06 — Inquiries (RFQs) | RF-06.01 a RF-06.08 | 5 | 8 |
| 07 — Leads e Créditos | RF-07.01 a RF-07.06 | 0 | 6 |
| 08 — Planos e Assinaturas | RF-08.01 a RF-08.06 | 0 | 6 |
| 09 — Painel do Fornecedor | RF-09.01 a RF-09.06 | 3 | 6 |
| 10 — Painel do Comprador | RF-10.01 a RF-10.03 | 1 | 3 |
| 11 — Verificação | RF-11.01 a RF-11.04 | 2 | 4 |
| 12 — Administração | RF-12.01 a RF-12.07 | 5 | 7 |
| 13 — Notificações | RF-13.01 a RF-13.04 | 1 | 4 |
| 14 — Institucional e Conteúdo | RF-14.01 a RF-14.03 | 2 | 3 |
| **TOTAL** | | **59** | **95** |

---

## 10. Índice de Requisitos Não-Funcionais (RNF)

| Categoria | Códigos | Qtd MVP | Qtd total |
|---|---|---|---|
| 01 — Performance | RNF-01.01 a RNF-01.08 | 8 | 8 |
| 02 — Escalabilidade | RNF-02.01 a RNF-02.05 | 2 | 5 |
| 03 — Disponibilidade | RNF-03.01 a RNF-03.05 | 4 | 5 |
| 04 — Segurança | RNF-04.01 a RNF-04.11 | 11 | 11 |
| 05 — Privacidade/LGPD | RNF-05.01 a RNF-05.08 | 6 | 8 |
| 06 — Acessibilidade | RNF-06.01 a RNF-06.05 | 4 | 5 |
| 07 — Compatibilidade | RNF-07.01 a RNF-07.04 | 3 | 4 |
| 08 — SEO Técnico | RNF-08.01 a RNF-08.07 | 7 | 7 |
| 09 — Observabilidade | RNF-09.01 a RNF-09.05 | 4 | 5 |
| 10 — Manutenibilidade | RNF-10.01 a RNF-10.05 | 4 | 5 |
| 11 — Backup e Recuperação | RNF-11.01 a RNF-11.04 | 3 | 4 |
| **TOTAL** | | **56** | **67** |

---

## 11. Índice de Regras de Negócio (RN)

| Grupo | Códigos | Qtd MVP | Qtd total |
|---|---|---|---|
| 01 — Cadastro e Contas | RN-01.01 a RN-01.13 | 10 | 13 |
| 02 — Perfil e Catálogo | RN-02.01 a RN-02.07 | 7 | 7 |
| 03 — Busca e Ranking | RN-03.01 a RN-03.05 | 4 | 5 |
| 04 — Inquiries | RN-04.01 a RN-04.09 | 5 | 9 |
| 05 — Distribuição de Leads | RN-05.01 a RN-05.10 | 0 | 10 |
| 06 — Planos e Assinaturas | RN-06.01 a RN-06.10 | 0 | 10 |
| 07 — Moderação e Confiança | RN-07.01 a RN-07.06 | 3 | 6 |
| 08 — SLA de Leads | RN-08.01 a RN-08.03 | 0 | 3 |
| 09 — Notificações | RN-09.01 a RN-09.03 | 2 | 3 |
| 10 — Dados e Analytics | RN-10.01 a RN-10.03 | 1 | 3 |
| **TOTAL** | | **32** | **69** |

---

## 12. Escopo do MVP (Scope Lock)

**Definição em uma frase:** Um marketplace web com cadastro unificado e progressão por engajamento (user → buyer → supplier), onde fornecedores fazem upgrade com validação de CNPJ e listam produtos gratuitamente, compradores encontram fornecedores via busca e SEO programático, e enviam inquiries com dados de contato visíveis apenas para fornecedores pagantes.

**Regra de ouro:** Se não é necessário para um fornecedor cadastrar produtos e um comprador enviar uma inquiry, não entra no MVP.

### MVP inclui (59 RF + 56 RNF + 33 RN):
- Cadastro unificado com progressão por engajamento (3 níveis: user → buyer → supplier)
- Upgrade para fornecedor com validação de CNPJ
- Selo "Empresa Verificada" para buyers com CNPJ + filtro para suppliers
- Barra de completude e nudges para buyer
- Dual-role (mesma conta pode ser buyer + supplier)
- Perfil de fornecedor editável com barra de completude
- Catálogo de produtos ilimitado e gratuito
- Busca textual + filtros + navegação por categorias
- SEO programático (páginas de produto, categoria, localidade, combinadas)
- Inquiries direcionadas (comprador → fornecedor específico)
- Painel do fornecedor (inquiries, produtos, analytics básico)
- Verificação automática de CNPJ (Nível 1)
- Admin: métricas, moderação, categorias
- Notificações por email
- Páginas institucionais

### MVP NÃO inclui (deliberadamente):
- Sistema de créditos/leads pagos (Monetização)
- Planos de assinatura e gateway de pagamento (Monetização)
- Inquiry genérica e distribuição por rodadas (Validação)
- Login social Google (Validação)
- Reivindicação de perfil pré-cadastrado (Validação)
- CRM de leads (Monetização)
- WhatsApp Business API (Escala)
- App nativo / PWA completo (Tração)
- Importação em massa via planilha (Validação)
- Selo GiroB2B Verificado Nível 2 (Monetização)

---

## 13. Terminologia padronizada (resumo do Glossário)

| Termo PT-BR | Código/API | NUNCA usar |
|---|---|---|
| Marketplace | — | classificados, diretório, portal, catálogo |
| Fornecedor | `supplier` | vendedor, lojista, anunciante |
| Comprador | `buyer` | cliente (ambíguo) |
| Solicitação de cotação / Cotação | `inquiry` | mensagem, chat, pergunta |
| Lead | `lead` | contato (genérico demais) |
| Crédito (de lead) | `credit` | moeda, token |
| Desbloqueio | `unlock` | compra de lead |
| Plano | `plan` (starter/pro/premium) | pacote |
| Conta gratuita | `free` | plano gratuito |
| Selo Verificado | `verified_badge` | certificado |

---

## 14. Métricas-chave (AARRR)

| Métrica | Meta MVP | Meta 12 meses |
|---|---|---|
| Fornecedores cadastrados/mês | 150-300 | 800-1.000 |
| % perfil completo (activation) | >60% | >70% |
| Retenção 30 dias | >50% | >65% |
| Conversão free→pago | 1-2% | 2-3% |
| Cadastros via indicação | >5% | >15% |
| Inquiries/mês | 100+ | 5.000+ |
| Buyer:supplier ratio | 3:1 a 5:1 | 10:1+ |
| MRR | R$0 | R$16K-60K |
| Churn mensal (pagantes) | — | <5% |

---

## 15. Dados de mercado pesquisados (fontes verificadas)

| Dado | Valor | Fonte |
|---|---|---|
| Empresas ativas Brasil | 24,2M | Gov Federal, 2º quad 2025 |
| Abertura 2025 | 5,1M (recorde, +18,6%) | Receita Federal / FENACON |
| % micro e pequenas | 93,8% | SEBRAE, 2025 |
| PIB das PMEs | 27% | SEBRAE |
| Maturidade digital PMEs | 40,77/100 (66% fase inicial) | SEBRAE/PR, 2024 |
| E-commerce B2B BR share | ~14,77% do total | Mordor Intelligence |
| CAGR e-commerce B2B | 18,42% até 2031 | Mordor Intelligence |
| PIB per capita BR | ~US$10.000 | World Bank |
| PIB per capita IN | ~US$2.778 | CEIC Data |
| Razão PIB per capita BR/IN | 3,6× | Cálculo |
| IndiaMART receita FY25 | ₹1.388 crores (~R$775M a R$950M conforme câmbio) | corporate.indiamart.com |
| IndiaMART suppliers | 8,4M cadastrados | idem |
| IndiaMART pagantes | ~220K | idem |
| IndiaMART EBITDA | 40% | idem |
| IndiaMART conversão | ~2,6% | 220K/8,4M |
| IndiaMART inquiries/tri | 27M únicas | idem |
| Churn B2B SaaS SMB | 3-5% mensal | Vitally / ChurnFree |
| CPL B2B médio global | $84 | Flywheel 2025 |
| CPL Google Ads B2B Brasil | R$35-90/lead | Agência Floki |
| CAC B2B SaaS Brasil | R$400-R$1.200 | Agência Floki, 2025 |
| Feira industrial (estande 9m²) | R$10K-25K total (~R$200-500/lead) | Pesquisa direta |
| Conversão B2B websites | 1,8% média | Unbounce, 2025 |
| Conversão tráfego orgânico | 2,6-2,7% | SERPSculpt, 2025 |

---

## 16. Algoritmos e lógicas-chave

### Ranking de busca (RN-03.01)
Pesos: relevância textual (35%) + nível do plano (25%) + completude do perfil (15%) + proximidade geográfica (15%) + frescor do cadastro (10%). Valores corrigidos conforme RN-03.01 autoridade (2026-04-03).

### Completude do perfil (RN-02.01)
Logo (10%) + descrição ≥100 chars (15%) + endereço (10%) + telefone (10%) + 1+ categoria (10%) + 3+ produtos (20%) + 1+ foto/produto (15%) + horário (5%) + ano fundação (5%).

### Distribuição de inquiries genéricas (RN-05.01 a RN-05.10)
- Máximo 5 fornecedores por inquiry
- 3 rodadas com intervalos de 4h (⚠️ provisório)
- Rodada 1: Premium → Rodada 2: Pro → Rodada 3: Starter
- Dentro de cada rodada: relevância categoria (40%) + proximidade (25%) + tempo de resposta (20%) + completude perfil (15%)
- Créditos consumidos no desbloqueio (1 por lead)
- Créditos semanais expiram domingo 00:01

### Fluxo de monetização
Fornecedor lista grátis → recebe inquiries → vê dados ocultos → assina plano → desbloqueia leads com créditos → fecha vendas fora da plataforma → renova/upgrade

---

## 17. Observações e pendências abertas

| # | Pendência | Afeta | Status |
|---|---|---|---|
| 1 | Márcio: subsetores industriais com mais acesso | Categorias, SEO, distribuição | ⏳ Aguardando |
| 2 | Intervalo entre rodadas de distribuição (4h provisório) | RN-05.02 | ⏳ Dados reais definem |
| 3 | Verificação Nível 2: processo operacional, custo, APIs | RN-07.06 | ⏳ Definir |
| 4 | Stack backend: Node.js ou Python/FastAPI | RNF-10.01+, CI/CD | ⏳ Vitor decide |
| 5 | Supabase Pro ($25/mês) para backups | RNF-11.01 | ⏳ Avaliar com créditos |
| 6 | LGPD: consentimento, moderação, retenção | RNF-05.x, RN-01.07 | ⏳ Revisão de advogado |
| 7 | Pesos dos algoritmos (ranking + distribuição) — atualizados em todos os artefatos (2026-04-04) | RN-03.01, RN-05.04 | ✅ Definido (A/B testing pós-launch) |
| 8 | PIB per capita ratio — alinhado para 3,6× em DNA, 1.1, 1.9 (2026-04-04) | Consistência | ✅ Resolvido |
| 9 | SLA de leads: planos NÃO garantem volume, apenas créditos | RN-08.01, RN-08.02 | ✅ Definido |
| 10 | Preços créditos extras: validar elasticidade | RN-05.10 | ⏳ Pós-lançamento |
| 11 | Saturação semanal: fator removido do algoritmo de distribuição por falta de dados reais. Implementar quando houver volume. | RN-05.05 | ⏳ Escala |
| 12 | Créditos avulsos no cancelamento: mantêm validade original de 90 dias, independente do cancelamento do plano. Fornecedor pagou preço cheio. | RN-05.10, UC-29 | ✅ Definido (2026-04-04) |
| 13 | **Cadastro Unificado no MVP:** Migração de cadastro separado (buyer/supplier) para cadastro unificado com progressão por engajamento em 3 níveis (user → buyer → supplier). Dual-role permitido. Role derivado em runtime. Motivação: reduzir fricção, valor antes do compromisso. | RF-01.01~17, RN-01.01~13, UC-01/12/31~33, US-001/024/061~064 | ✅ Definido (CEO+CTO, 04/04/2026) |
| 14 | **CPF nunca coletado:** decisão explícita — dado sensível, sem valor de negócio para marketplace B2B. CNPJ do buyer é opcional (selo de verificação). | RN-01.13 | ✅ Definido (04/04/2026) |
| 15 | **Selo "Empresa Verificada" + Filtro:** Buyer com CNPJ validado (BrasilAPI) recebe selo visível ao supplier antes do desbloqueio. Supplier pode ativar filtro "Apenas Empresas Verificadas" (default OFF, com aviso de impacto). | RF-01.14, RF-01.15, RN-01.12 | ✅ Definido (04/04/2026) |
| 16 | URL da página de upgrade para fornecedor (`/upgrade/fornecedor`? `/painel/upgrade`?) | 3.1, 2.8 | ⚠️ Vitor decide |
| 17 | Comportamento quando buyer informa CNPJ que já existe como supplier (vincular conta? bloquear? sugerir login?) | RN-01.02 | ⚠️ Vitor decide |
| 18 | Valores exatos da barra de completude do buyer (40/60/80/90/100% são sugestão, Vitor valida) | RF-01.16 | ⚠️ Vitor valida |
| 19 | `user_role` enum: manter `user|buyer|supplier|admin` com `dual` derivado em runtime? Ou adicionar `dual` ao enum? Risco de dessincronização se persistido. | ERD, Classes | ⚠️ Vitor decide |

---

## 18. URLs de SEO programático

| Tipo | Padrão de URL |
|---|---|
| Produto | `/produto/[slug-do-produto]-[cidade]` |
| Categoria | `/categoria/[slug]` |
| Localidade | `/fornecedores/[cidade]-[estado]` |
| Categoria + localidade | `/fornecedor-de/[categoria]-em-[cidade]` |

---

## 19. Notificações por email (resumo RN-09.01)

| Evento | Destinatário | Timing | Fase |
|---|---|---|---|
| Confirmação de cadastro (Nível 1) | Usuário | Imediato | MVP |
| Nova inquiry | Fornecedor | Imediato | MVP |
| Inquiry visualizada | Comprador | Até 1h | MVP |
| Perfil incompleto | Fornecedor | 3d, 7d, 14d, 30d | MVP |
| Resumo semanal | Fornecedor | Segunda 9h | MVP |
| Lembrete cobrança | Fornecedor pagante | 3d antes | Monetização |
| Falha cobrança | Fornecedor pagante | Imediato | Monetização |
| Créditos esgotados | Fornecedor pagante | Ao consumir último | Monetização |
| Créditos renovados | Fornecedor pagante | Domingo 00:01 | Monetização |

---

## 20. Créditos cloud

| Programa | Valor | Status (abr/2026) |
|---|---|---|
| AWS Activate | US$1.000 | ✅ Aprovado |
| Microsoft Azure | US$1.000 | ✅ Resgatado |
| Microsoft Azure (análise) | +US$5.000 | ⏳ Em análise |
| Google Cloud (free trial) | US$300 | ✅ Ativo |
| Google Cloud Start | +US$2.000/ano | ⏳ Em análise (case #00268665) |
| **Total garantido** | **~US$2.300** | |
| **Total potencial** | **~US$9.300** | US$2.300 + US$5.000 + US$2.000 |

---

## 21. Índice de Casos de Uso (Fase 2)

**Artefato:** 2.1_CASOS_DE_USO.md | **Total:** 33 UCs | **Cobertura:** 80/95 RFs diretos (15 cobertos como extensões)

### Por ator

| Ator | UCs | Qtd |
|---|---|---|
| Usuário (Nível 1) | UC-01 | 1 |
| Fornecedor | UC-02 a UC-10, UC-31, UC-33 | 11 |
| Comprador | UC-11 a UC-16, UC-12, UC-32 | 7 |
| Usuário (ambos) | UC-17 | 1 |
| Admin | UC-18 a UC-23 | 6 |
| Sistema (automático) | UC-24 a UC-30 | 7 |

### Lista resumida

| UC | Nome | Fase | Ator |
|---|---|---|---|
| UC-01 | Cadastrar-se na plataforma (Nível 1 — unificado) | MVP | Usuário |
| UC-02 | Editar perfil da empresa | MVP | Fornecedor |
| UC-03 | Cadastrar produto | MVP | Fornecedor |
| UC-04 | Gerenciar produtos | MVP | Fornecedor |
| UC-05 | Visualizar e responder inquiries | MVP/Monet. | Fornecedor |
| UC-06 | Denunciar inquiry como spam | Validação | Fornecedor |
| UC-07 | Assinar plano pago | Monetização | Fornecedor |
| UC-08 | Desbloquear lead com crédito | Monetização | Fornecedor |
| UC-09 | Gerenciar assinatura | Monetização | Fornecedor |
| UC-10 | Importar produtos em massa | Validação | Fornecedor |
| UC-11 | Buscar produtos e fornecedores | MVP | Comprador |
| UC-12 | Ativar perfil de comprador (Nível 2 — buyer) | MVP | Comprador |
| UC-13 | Enviar inquiry direcionada | MVP | Comprador |
| UC-14 | Enviar inquiry genérica | Validação | Comprador |
| UC-15 | Denunciar fornecedor | MVP | Comprador |
| UC-16 | Salvar fornecedor como favorito | Validação | Comprador |
| UC-17 | Fazer login e recuperar senha | MVP | Ambos |
| UC-18 | Gerenciar fornecedores | MVP | Admin |
| UC-19 | Gerenciar categorias | MVP | Admin |
| UC-20 | Moderar produtos | MVP | Admin |
| UC-21 | Tratar denúncias | MVP | Admin |
| UC-22 | Visualizar métricas e relatórios | MVP/Valid. | Admin |
| UC-23 | Criar perfil pré-cadastrado | Validação | Admin |
| UC-24 | Validar CNPJ automaticamente | MVP | Sistema |
| UC-25 | Gerar páginas SEO programáticas | MVP | Sistema |
| UC-26 | Enviar notificações | MVP | Sistema |
| UC-27 | Calcular ranking de busca | MVP | Sistema |
| UC-28 | Distribuir inquiry genérica | Monetização | Sistema |
| UC-29 | Processar cobrança recorrente | Monetização | Sistema |
| UC-30 | Renovar/expirar créditos semanais | Monetização | Sistema |
| UC-31 | Fazer upgrade para fornecedor (Nível 3) | MVP | Usuário/Buyer |
| UC-32 | Verificar empresa como comprador (selo) | MVP | Buyer |
| UC-33 | Configurar filtro de leads verificados | MVP | Supplier |

---

## 22. Índice de User Stories (Fase 2)

**Artefato:** 2.2_USER_STORIES.md | **Total:** 64 User Stories | **Cobertura:** 95/95 RFs (diretos + critérios de aceite)

### Por ator

| Ator | User Stories | Qtd |
|---|---|---|
| Usuário/Fornecedor | US-001, US-061 a US-020 | 21 |
| Comprador | US-021 a US-032, US-062, US-064 | 14 |
| Usuário (ambos) | US-033 a US-035 | 3 |
| Admin | US-036 a US-047 | 12 |
| Sistema | US-048 a US-060 | 13 |
| Fornecedor (filtro) | US-063 | 1 |

### Por fase (com Story Points)

| Fase | Qtd | SP total |
|---|---|---|
| MVP | 41 | 153 |
| Validação | 10 | 40 |
| Monetização | 12 | 51 |
| Escala | 1 | 13 |
| **Total** | **64** | **257** |

### Estrutura de cada US

Formato ágil: narrativa "Como [ator], quero [ação] para [benefício]" + critérios de aceite verificáveis (CA-XXX.Y). Prioridade MoSCoW (Must/Should/Could/Won't yet). Estimativa em Story Points (Fibonacci: 1-13).

### Relação com Casos de Uso

Cada UC (2.1) gerou 1 a 3 User Stories. UCs complexos foram decompostos em stories menores para facilitar implementação incremental. Exemplo: UC-07 (Assinar plano) gerou US-012 (comparativo), US-016 (assinatura), US-017 (trial).

---

## 23. Stack Tecnológico — Decisões-chave (Fase 2)

**Artefato:** 2.3_STACK_TECNOLOGICO.md | **14 tecnologias documentadas** | **Custo MVP: R$0 a ~$50/mês**

### Princípios das escolhas
1. Custo zero no MVP (free tiers + créditos cloud ~US$2.300)
2. SEO desde o dia 1 (SSR/SSG/ISR obrigatório)
3. Time de 1 dev (stack unificada, TypeScript end-to-end)
4. Escala sem reescrever (500 a 30.000 fornecedores)
5. Ecossistema integrado (menos ferramentas, mais integração nativa)

### Decisão-chave: back-end unificado
Recomendação: Node.js + Next.js API Routes (monolito). Uma linguagem, um deploy, zero latência front↔back. Python/FastAPI como back-end separado descartado para o MVP por overhead de stack dupla. ⚠️ Decisão final: Vitor (CTO).

### Pendências técnicas do 2.3
1. Vitor decide: Node.js ou Python/FastAPI
2. Supabase Free → Pro: quando migrar (pausa automática)
3. Cloudflare R2 vs Supabase Storage para imagens
4. Vercel Hobby → Pro antes de produção (uso comercial)
5. ReceitaWS vs BrasilAPI para CNPJ
6. ORM: Prisma vs Drizzle

### Integrações externas planejadas
ReceitaWS/BrasilAPI (CNPJ, MVP), Stripe (pagamentos, Monetização), WhatsApp Business API (Escala), Cloudflare Turnstile (captcha, MVP), Google Search Console (SEO, MVP).

---

## 24. Diagrama de Arquitetura (Fase 2)

**Artefato:** 2.4_DIAGRAMA_DE_ARQUITETURA.md | **5 visões** | **8 ADRs** | **5 diagramas Mermaid**

### 5 visões da arquitetura
1. Visão Geral (C4 Container) — todos os blocos e conexões
2. Fluxo de Dados — jornada completa da inquiry (comprador → fornecedor)
3. Infraestrutura e Deploy — ambientes (local, staging, prod), CI/CD pipeline
4. SEO Programático — geração de páginas SSG/ISR, sitemap, indexação
5. Segurança e Autenticação — 8 camadas (rede → dados), RBAC/RLS

### Decisões arquiteturais (ADRs)
- ADR-01: Monolito modular Next.js (não microserviços)
- ADR-02: Cloudflare R2 para imagens (não Supabase Storage — 10 GB vs 1 GB free)
- ADR-03: SSG/ISR para SEO, SSR apenas para busca
- ADR-04: RLS no Supabase como camada de autorização
- ADR-05: PostHog cookieless (não Google Analytics) — LGPD-first
- ADR-06: PWA (não app nativo)
- ADR-07: App Router (não Pages Router)
- ADR-08: Vitest (não Jest) para testes

### Estrutura de diretórios
Projeto Next.js com App Router. Separação por domínio: `app/(public)/` rotas SEO, `app/(auth)/` autenticação, `app/(dashboard)/` painéis, `app/api/` API Routes, `lib/` lógica de negócio por funcionalidade.

### Volume de páginas SEO estimado
MVP (mês 3): ~4.750 | Mês 12: ~51.000 | Mês 18: ~182.500 páginas indexáveis.

---

## 25. Diagrama Entidade-Relacionamento — ERD (Fase 2)

**Artefato:** `2.5_ERD.md` | **Data:** 2026-04-03

### Resumo do modelo

- **30 entidades** organizadas em 6 domínios: Identidade (5), Catálogo (4), Inquiries/Leads (5), Monetização (6), Moderação/Confiança (4), Notificações/Analytics (6)
- **~300 campos** com tipos PostgreSQL, constraints e índices definidos
- **27 ENUMs** PostgreSQL (user_role atualizado com valor `user`; `dual` derivado em runtime — §17 #19)
- **~40 relacionamentos FK** documentados
- **6 diagramas Mermaid** (1 consolidado + 5 por domínio)
- **9 decisões de modelagem** documentadas com justificativa

### Entidades por fase

| Fase | Qtd | Entidades |
|------|-----|-----------|
| MVP | 20 | profiles, suppliers, buyers, locations, categories, supplier_categories, products, product_images, supplier_images, inquiries, inquiry_responses, reports, admin_actions, system_configs, notifications, notification_preferences, email_logs, search_logs |
| Validação | 4 | product_imports, favorites, buyer_alerts (+ inquiry genérica em inquiries) |
| Monetização | 7 | plans, subscriptions, credits_weekly, credits_extra, credit_transactions, payment_attempts, distribution_rounds, leads, verification_documents |

### Decisões-chave

1. **`free` = ausência de plano** (não registro na tabela `plans`)
2. **Dados do comprador denormalizados na inquiry** (snapshot LGPD)
3. **Plano efetivo derivado** via JOIN com `subscriptions` (sem coluna redundante em `suppliers`)
4. **Tabela `locations` normalizada** para busca geográfica e SEO por localidade
5. **Tags como JSONB array** com índice GIN (sem tabela N:N separada)
6. **Soft delete via `deleted_at TIMESTAMPTZ`** (não boolean)
7. **Target polimórfico** em `reports` e `admin_actions` (target_type + target_id)
8. **`system_configs` key-value** para parâmetros configuráveis sem deploy
9. **Profile completeness como campo calculado armazenado** (recalculado na aplicação)

### Padrões técnicos

- PKs: UUID v7 em todas as tabelas
- Nomenclatura: snake_case, inglês, tabelas no plural
- Audit fields: 4 padrões (A: com soft delete, B: mutável, C: imutável, D: configuração)
- RLS: policies esboçadas para todas as 30 tabelas
- Full-text search: tsvector + GIN em products

### Pendências sinalizadas

12 pendências documentadas, incluindo: ORM (Prisma vs Drizzle), R2 vs Supabase Storage, threshold de denúncias, intervalo de rodadas, seed de locations, mecanismo de inquiry_responses no MVP.

---

## 26. Diagrama de Classes (Fase 2)

**Artefato:** `2.6_DIAGRAMA_DE_CLASSES.md` | **Data:** 2026-04-03

### Resumo do modelo

- **30 interfaces base** (1:1 com entidades do ERD), organizadas nos mesmos 6 domínios
- **~22 DTOs** de criação/atualização (Create/Update)
- **~10 tipos derivados** (PublicProfile, SearchResult, Card, SupplierView, etc.)
- **~5 tipos utilitários** transversais (AuditFields, PaginatedResult, ServiceResult, CreditBalance, BusinessHours)
- **15 services** com ~85 métodos documentados (assinaturas + RFs/RNs rastreados)
- **25 Zod schemas** (10 criação, 8 atualização, 5 consulta/filtro, 2 domínio/cálculo)
- **14 repositories** com funções de acesso a dados
- **26 ENUMs** mapeados como `as const` + union types
- **7 diagramas Mermaid** (1 consolidado + 6 por domínio)
- **8 padrões de design** documentados com justificativa

### Camadas da arquitetura

| Camada | Estereótipo UML | Localização | Responsabilidade |
|--------|----------------|-------------|-----------------|
| Domínio | `<<interface>>` | `types/` | Interfaces TypeScript, DTOs, tipos derivados |
| Validação | `<<schema>>` | `lib/validation/` | Zod schemas com validações de RNs |
| Serviço | `<<service>>` | `lib/{domain}/` | Lógica de negócio, orquestração, RNs |
| Repository | `<<repository>>` | `lib/db/` | Queries ao Supabase/ORM, RLS-aware |

### Services por domínio

| Domínio | Services | Métodos |
|---------|----------|---------|
| Identity | authService, supplierService | ~13 |
| Catalog | productService, categoryService | ~10 |
| Inquiries & Leads | inquiryService, distributionService, leadService | ~18 |
| Monetization | subscriptionService, creditService, billingService | ~16 |
| Moderation & Trust | moderationService | ~7 |
| Notifications & Analytics | notificationService, analyticsService | ~12 |
| Cross-cutting | searchService, seoService | ~10 |

### Padrões de design

1. **Repository Pattern** — isola queries, facilita troca de ORM (Prisma ↔ Drizzle)
2. **Service Layer** — lógica de negócio encapsulada, RNs vivem aqui
3. **DTO Pattern** — separa modelo de DB da API pública
4. **Schema Validation (Zod)** — runtime type safety, shared client/server
5. **Result Pattern** — `ServiceResult<T>` = success/error union, sem throws
6. **Soft Delete** — consistente com ERD (DM-06)
7. **Derived State** — `getEffectivePlan()`, `calculateCompleteness()`, sem campos redundantes
8. **Two Independent Ranking Algorithms** — search ranking (RN-03.01) vs distribution ranking (RN-05.04) com pesos distintos, documentados explicitamente para evitar unificação indevida

### Decisões-chave

1. **`as const` union types** (não TypeScript `enum`) — tree-shakeable, mais idiomático
2. **Sem `locationService`** — `findOrCreate` vive em `authService.register()` (cadastro unificado) e `upgradeToSupplier()`, admin CRUD via `locationRepository` direto
3. **Sem repository para `search_logs` e `buyer_alerts`** — tabelas simples, queries diretas nos services
4. **`seoService` como service** (não helpers) — por consistência, embora sejam funções utilitárias
5. **Convenção snake_case → camelCase** — mapeamento automático entre PostgreSQL e TypeScript
6. **TSVECTOR omitido** das interfaces (campo DB-only, gerido por trigger)

### Rastreabilidade

- 14 módulos de RF (90 requisitos) mapeados para 15 services
- 10 grupos de RN (66 regras) mapeados para schemas e services
- Verificação cruzada: 30/30 entidades do ERD com interface correspondente

---

## 27. Jornada do Comprador (Fase 2)

**Artefato:** `2.7_JORNADA_DO_COMPRADOR.md` | **Data:** 2026-04-04

### Resumo

- **6 etapas macro:** Descoberta → Exploração → Avaliação → Contato → Acompanhamento → Retenção
- **12 diagramas Mermaid** (2 overview + 6 etapas internas + 4 fluxos críticos)
- **4 fluxos críticos** detalhados: Busca e Descoberta, Inquiry Direcionada, Inquiry Genérica [VAL], Cadastro do Comprador
- **Rastreabilidade:** 6 UCs (UC-11 a UC-17), 15 USs (US-021 a US-035), ~30 RFs, ~20 RNs
- **Princípio fundamental:** Comprador NUNCA paga. Zero fricção até o momento da inquiry.

### Etapas por fase

| Fase | Etapas | Funcionalidades do comprador |
|------|--------|------------------------------|
| MVP | Descoberta, Exploração, Avaliação, Contato, Acompanhamento | Busca + filtros + SEO + inquiry direcionada + painel básico |
| Validação | + Retenção completa | + Inquiry genérica + favoritos + alertas + autocomplete + login Google |
| Monetização | (indireta) | Mais fornecedores verificados, respostas mais rápidas |
| Escala | (indireta) | IA matchmaking, PWA, comparação lado a lado |

### Decisões-chave

1. **Ativação lazy de buyer** — ativação de buyer (Nível 2) só na etapa 4 (Contato), quando tenta enviar inquiry. Se não logado: cadastro Nível 1 + ativação Nível 2 em sequência.
2. **Formulário inline** — sem redirect para página separada (CA-024.8)
3. **Assimetria de informação by design** — comprador não sabe se fornecedor é free/pago
4. **Threshold de denúncias** — 3 = advertência, 5 = suspensão, configurável via `system_configs`
5. **Selo "Empresa Verificada"** — buyers com CNPJ validado recebem selo, visível ao supplier antes do desbloqueio
6. **Barra de completude + nudges** — incentivam buyer a completar perfil e informar CNPJ (opcional)

### Inconsistência documentada

~~Pesos de ranking no UC-11 (40/20/20/15/5) divergiam da RN-03.01 corrigida.~~ **✅ Resolvido (2026-04-04):** UC-11, UC-27, US-021, US-052 atualizados para 35/25/15/15/10 conforme REFERENCIA §16.

---

## 28. Jornada do Fornecedor (Fase 2)

**Artefato:** `2.8_JORNADA_DO_FORNECEDOR.md` | **Data:** 2026-04-04

### Resumo

- **9 etapas macro:** Descoberta → Upgrade para Fornecedor (Nível 3) → Configuração do Perfil → Catálogo → Primeiras Inquiries → Momento Aha → Decisão de Assinar → Operação como Pagante → Renovação/Churn
- **18 diagramas Mermaid** (2 overview + 9 etapas internas + 6 fluxos críticos + 1 state diagram assinatura)
- **6 fluxos críticos** detalhados: Cadastro Completo, Publicação de Produto, Recebimento de Inquiry, Decisão de Assinatura, Desbloqueio de Lead, Ciclo de Créditos
- **Rastreabilidade:** 10 UCs (UC-01 a UC-10) + UC-17, 20 USs (US-001 a US-020) + US-033/034/035, ~40 RFs, ~45 RNs
- **Princípio fundamental:** Fornecedor é o gerador de receita. Modelo freemium: lista grátis, paga para acessar leads.

### Etapas por fase

| Fase | Etapas | Funcionalidades do fornecedor |
|------|--------|-------------------------------|
| MVP | Descoberta a Primeiras Inquiries (1-5) | Upgrade para fornecedor (CNPJ + endereço) + perfil + catálogo ilimitado + inquiries mascaradas + dashboard + filtro empresas verificadas |
| Validação | + parcial Momento Aha | + Inquiry genérica + importação CSV + login Google + reivindicação perfil |
| Monetização | Momento Aha a Renovação (6-9) | + Planos pagos + créditos + desbloqueio + CRM + selo L2 + trial 7d |
| Escala | Todas (melhorias) | + WhatsApp + API + subdomínio + múltiplos usuários + IA matchmaking |

### Decisões-chave

1. **Momento Aha** — frustração controlada com dados mascarados como gatilho de conversão free→pago
2. **Dois algoritmos independentes** — busca (RN-03.01: 35/25/15/15/10) ≠ distribuição (RN-05.04: 40/25/20/15)
3. **Completude como gamificação** — 9 componentes com pesos (RN-02.01), afeta busca (15%) e distribuição (15%)
4. **Créditos semanais expiram** — domingo 00:01, sem acúmulo; extras 90d; FIFO no consumo
5. **Trial 7d sem cartão** — elegível se 3+ produtos e ≥50% perfil (RN-06.08)
6. **Paradoxo MVP** — no MVP todos são free, CTAs educativos, white-glove manual (Márcio)

### Inconsistências documentadas

~~Três inconsistências entre 1.6 e REFERENCIA §16: pesos de busca, distribuição e completude.~~ **✅ Resolvido (2026-04-04):** Todos os artefatos (1.6, 2.1, 2.2, 2.7, 2.8) atualizados conforme REFERENCIA §16. Fator "Saturação" removido da distribuição (pendência futura §17 #11).

### Complementaridade com 2.7

O artefato 2.8 é o espelho do 2.7: inquiry enviada (comprador) = inquiry recebida (fornecedor); dados mascarados (proteção do comprador) = frustração (conversão do fornecedor); selo verificado (confiança do comprador) = verificação (investimento do fornecedor). A seção 9 do 2.8 espelha a seção 8 do 2.7.

---

## 29. Diagrama de Componentes (Fase 3)

O artefato 3.1 decompõe o container "Next.js (Vercel)" do 2.4 (C4 Level 2) em componentes internos (C4 Level 3). Documenta **~108 componentes** organizados em **9 domínios**: Identity (~22, inclui cadastro unificado + upgrade + selo + nudges), Catalog (14), Search & Discovery (12), Inquiries (11), Leads & Distribution [MON] (10), Monetization [MON] (13), Moderation & Trust (10), Notifications & Analytics (12), Cross-cutting (12). Contém **14 diagramas Mermaid** (1 consolidado, 9 por domínio, 1 dependências entre domínios, 3 fluxos sequenciais).

**Componentes por fase:** MVP 75 (72%), [VAL] 5, [MON] 23 (22%), [ESC] 1.

**Decisões-chave documentadas:**
1. Organização `lib/` por domínio recomendada (duas opções apresentadas para CTO — pendência CTO-01)
2. API routes como thin controllers (Zod → service → response)
3. Dois algoritmos de ranking independentes em domínios separados (Search vs Leads)
4. External service wrappers isolados por domínio (stripeClient, resendClient, cnpjClient)
5. Jobs com interface padronizada (JobHandler): MVP = Edge Functions, escala = BullMQ+Redis
6. Sem dependências circulares entre domínios (DAG confirmado)

**Fluxos críticos documentados:** Busca de produto (SSR → FTS → ranking RN-03.01), Envio de inquiry (Turnstile → dedup → create → notify), Desbloqueio de lead [MON] (balance check → consume credit → mark unlocked).

**Rastreabilidade:** 14/14 módulos RF (100%), 10/10 grupos RN (100%), 11/11 categorias RNF (100%).

**Pendências novas:** CTO-01 (convenção diretórios lib/), CTO-02 (job runner MVP), CTO-03 (R2 vs Storage custo). Pendências herdadas: ORM, backend stack, API CNPJ.

O artefato complementa o 2.4 (que mostra containers) e o 2.6 (que define services/repos/schemas): o 3.1 organiza esses elementos em componentes implementáveis com diretórios concretos, interfaces cross-domain e fluxos de comunicação. É o documento de referência para o CTO iniciar a implementação.

---

## 30. Diagramas de Sequência (Fase 3)

O artefato 3.2 documenta **19 fluxos de interação detalhados** (SEQ-01 a SEQ-19) entre componentes, serviços externos e atores, complementando a visão estática do 3.1 com a visão dinâmica. Todos os diagramas usam `sequenceDiagram` Mermaid com `autonumber`, participantes reais do 3.1 e métodos do 2.6. Organizados em **6 grupos**: Identidade (3), Catálogo (2), Busca (1), Inquiries (3), Monetização (4), Moderação/Sistema (3).

**Cenários por fase:** MVP 12 (inclui SEQ-17 ativação buyer, SEQ-18 upgrade supplier, SEQ-19 verificação empresa), VAL/MON 1, MON 6.

**Cobertura:** 20/30 UCs (67%), 10/14 módulos RF (71%), 8/10 grupos RN (80%). UCs não cobertos são CRUD puro ou admin sem interação cross-domain (justificados na seção 9.2).

**Cenários documentados:**
- SEQ-01 Cadastro unificado (Nível 1), SEQ-02 Login, SEQ-03 Perfil+completude, SEQ-04 Produto+imagens, SEQ-05 ISR/SEO, SEQ-06 Busca+ranking (RN-03.01), SEQ-07 Inquiry direcionada, SEQ-08 Visualização (dados mascarados para TODOS), SEQ-09 Distribuição genérica [VAL/MON] (RN-05.04), SEQ-10 Assinatura [MON], SEQ-11 Desbloqueio lead [MON], SEQ-12 Renovação créditos [MON], SEQ-13 Dunning [MON], SEQ-14 Denúncia+moderação, SEQ-15 CNPJ auto-verificação, SEQ-16 Nudges perfil incompleto, SEQ-17 Ativação de buyer (Nível 2), SEQ-18 Upgrade para supplier (Nível 3), SEQ-19 Verificação de empresa (buyer).

**Decisão importante (SEQ-08):** Visualizar inquiry NÃO consome crédito. Todos os fornecedores (free e paid) veem dados mascarados. O desbloqueio é ação explícita separada (SEQ-11) que consome 1 crédito.

**Hub principal:** notificationService (presente em 10/16 cenários). Padrão predominante: síncrono request-response (80%), com paralelo (email+realtime), fire-and-forget (analytics) e jobs assíncronos.

**62 fluxos alternativos** documentados com `alt`/`opt`/`break`. Todos os cenários incluem pelo menos 1 tratamento de erro.

**Edge cases identificados:** Race condition no unlock (UNIQUE constraint), webhook Stripe fora de ordem (verificar status), expiração de crédito durante request (transação atômica).

O artefato complementa o 3.1 (quais componentes existem) mostrando como eles interagem ao longo do tempo. Os 3 diagramas simplificados do 3.1 seção 8 são expandidos com fluxos alternativos completos nos SEQ-06, SEQ-07 e SEQ-11.

---

## 31. Mapa de Integrações (Fase 3)

**Artefato:** `3.3_MAPA_DE_INTEGRACOES.md` | **18 integrações** | **7 grupos** | **3 diagramas Mermaid** | **28 variáveis de ambiente**

O artefato 3.3 documenta todas as integrações externas do GiroB2B, consolidando os 12+ serviços `<<external>>` do 3.1 e os padrões de comunicação dos 16 cenários do 3.2 em fichas padronizadas com autenticação, endpoints usados, limites, custos, fallback e lock-in.

**18 integrações em 7 grupos:**
- **Grupo 1 — BaaS (Supabase):** Auth (INT-01), PostgreSQL (INT-02), Realtime (INT-03), Edge Functions (INT-04)
- **Grupo 2 — Edge (Cloudflare):** CDN (INT-05), R2 (INT-06), Turnstile (INT-07)
- **Grupo 3 — Comunicação:** Resend (INT-08), WhatsApp [ESC] (INT-09)
- **Grupo 4 — Pagamento:** Stripe [MON] (INT-10)
- **Grupo 5 — Observabilidade:** Sentry (INT-11), PostHog (INT-12), Better Stack (INT-13), Vercel Analytics (INT-14)
- **Grupo 6 — APIs de Dados:** BrasilAPI/ReceitaWS (INT-15), Google Search Console (INT-16)
- **Grupo 7 — DevOps:** GitHub+Actions (INT-17), Vercel (INT-18)

**Custos por fase:** MVP Dev $0 → MVP Launch $45-65/mês → Validação $65/mês → Monetização $65-155/mês + Stripe fees → Escala $160-390/mês. Créditos cloud ~US$2.300 como reserva (não usados no stack atual).

**Classificação de impacto:** Crítico (Supabase PG, Auth, Vercel), Degradado (Resend, R2, BrasilAPI, Stripe, Turnstile), Cosmético (Sentry, PostHog, Better Stack, Vercel Analytics, GSC, Realtime).

**Migrações obrigatórias antes do launch:** Vercel Hobby → Pro ($20/mês, uso comercial), Supabase Free → Pro ($25/mês, pausa por inatividade).

**Hub de integração:** Supabase PostgreSQL (16/16 cenários), Resend (9/16 cenários).

---

## 32. Padrões e Convenções (Fase 3)

**Artefato:** `3.4_PADROES_E_CONVENCOES.md` | **Data:** 2026-04-05 | **~2.260 linhas** | **18 seções** | **2 diagramas Mermaid**

O artefato 3.4 consolida, formaliza e expande todas as convenções de desenvolvimento espalhadas nos artefatos anteriores (2.3 a 2.6, 3.1 a 3.3, 1.5) em um documento único e autoritativo. É o guia de estilo para o CTO e futuros desenvolvedores.

### Conteúdo principal

- **11 Design Patterns obrigatórios:** Repository, Service Layer, Result Pattern, DTO, Schema Validation (Zod), Soft Delete, Derived State, Two Independent Rankings, Thin Controller, External Service Wrapper (DC-07), Job Handler (DC-08)
- **18 seções:** Princípios, nomenclatura (30+ convenções), estrutura de diretórios (Opção A/B), patterns, API routes, banco de dados, erros, logging, testes, Git, CI/CD, UI, SEO/performance, segurança, i18n, documentação, rastreabilidade, pendências
- **2 diagramas Mermaid:** Fluxo de API request (Zod → Auth → Service → Response), pipeline CI/CD (lint → types → test → build → deploy)
- **Inventários completos:** 25 schemas Zod, 7 jobs, 28 env vars, 27 ENUMs, 4 padrões de audit fields (A/B/C/D)
- **Pendências herdadas:** CTO-01 a CTO-03 + ORM + backend + API CNPJ
- **Pendências novas:** CTO-04 (dark mode adiado para Tração), CTO-05 (cursor pagination na Escala)
- **Decisões tomadas:** sem versionamento de API no MVP, offset-based pagination, squash merge, dark mode adiado

### Consistência verificada

- Pesos de busca: 35/25/15/15/10 (REFERENCIA §16) ✅
- Pesos de distribuição: 40/25/20/15 (REFERENCIA §16) ✅
- Cadastro unificado 3 níveis: CreateUserDTO, UpgradeToSupplierDTO, ActivateBuy

---

## 33. Projeção de Custos Operacionais (Fase 4 — primeiro artefato)

**Artefato:** `4.1_PROJECAO_DE_CUSTOS_OPERACIONAIS.md` | **Rev. 1.1** | **~804 linhas** | **11 seções**

Documenta os 19 serviços em 5 categorias (A-Infra, B-Ferramentas, C-APIs, D-DevOps, E-Futuro) com custos mês a mês em 5 cenários (C1 Dev R$0 → C5 Escala ~R$2.100). Break-even de infra: 5-10 pagantes. Unit economics: margem de contribuição ~95%. Stress tests e benchmarks incluídos.

---

## 34. Projeção Financeira Técnica (Fase 4 — segundo artefato)

**Artefato:** `4.2_PROJECAO_FINANCEIRA_TECNICA.md` | **Rev. 1.0.1** | **~794 linhas** | **12 seções** | **4 diagramas Mermaid**

Responde "quando e como o GiroB2B se paga?" — unindo receita (1.9), custos (4.1) e fluxo de caixa numa projeção de 18 meses. Projeção mês a mês em 3 cenários (conservador/base/otimista).

### Números-chave

| Indicador | Valor |
|-----------|-------|
| MRR M12 (base) | R$21.567 |
| MRR M18 (base) | R$94.991 |
| ARR M18 (base) | ~R$1,14M |
| Caixa M18 (base) | R$352K |
| Break-even caixa | Mês 7 |
| Investimento externo | Não (bootstrappable) |
| Valuation indicativo M18 | R$5,7M-14,3M |

---

## 35. Política de Segurança (Fase 4 — terceiro artefato)

**Artefato:** `4.3_POLITICA_DE_SEGURANCA.md` | **Data:** 2026-04-06 | **13 seções** | **2 diagramas Mermaid**

Transforma os 15 RNFs de segurança (RNF-04.01 a 04.11) e backup (RNF-11.01 a 11.04) em políticas implementáveis. Documento para CTO (configuração) e investidores (due diligence).

### Conteúdo

| Seção | Conteúdo |
|-------|----------|
| 1 | Escopo e classificação de dados (4 níveis: Público/Interno/Confidencial/Restrito) |
| 2 | Autenticação: Supabase Auth, bcrypt ≥10, JWT 24h, refresh 7d, brute force protection |
| 3 | Autorização: RBAC 2 camadas (middleware + RLS), tabela CRUD por role, dados mascarados |
| 4 | Proteção de dados: TLS 1.2+, AES-256 at rest, Stripe PCI DSS Level 1, cookies httpOnly |
| 5 | Ameaças: OWASP Top 10 2025 mapeado, SQLi/XSS/CSRF/DDoS/brute force/bots |
| 6 | Segurança de APIs: Zod validation, rate limiting por tier, CORS restritivo, logs |
| 7 | Gestão de secrets: 28 env vars inventariadas, política de rotação, Vercel encrypted |
| 8 | Backup e DR: RPO 24h/1h, RTO 4h, regra 3-2-1, PITR Supabase, procedimento de restore |
| 9 | Monitoramento: Sentry + Better Stack + PostHog, alertas, plano de resposta a incidentes |
| 10 | DevSecOps: CI/CD pipeline, code review, Dependabot, pre-commit hooks para secrets |
| 11 | Acesso humano: 3 founders, 2FA obrigatório, offboarding com rotação de keys |
| 12 | Compliance: LGPD (→4.4), PCI DSS (→Stripe), SOC2/ISO roadmap |
| 13 | Rastreabilidade: seção × RNFs × artefatos × integrações |

### Cobertura de RNFs

- **Segurança (RNF-04.01 a 04.11):** 11/11 endereçados ✅
- **Backup (RNF-11.01 a 11.04):** 4/4 endereçados ✅
- **CPF nunca coletado:** confirmado ✅
- **28 env vars:** inventário completo com classificação ✅

---

## 36. Compliance LGPD (Fase 4 — quarto artefato)

**Artefato:** `4.4_COMPLIANCE_LGPD.md` | **Data:** 2026-04-06 | **13 seções** | **2 diagramas Mermaid**
**Status:** Rascunho — pendente revisão jurídica

Framework técnico-operacional de compliance LGPD (Lei 13.709/2018). Cobre inventário de dados, bases legais, consentimento no cadastro 3 níveis, direitos do titular, compartilhamento com terceiros, retenção/eliminação, resposta a incidentes e pendências jurídicas.

### Conteúdo

| Seção | Conteúdo |
|-------|----------|
| 1 | Escopo e Aplicabilidade: controlador (GIROB2B I.S.), DPO pendente, CPF nunca coletado |
| 2 | Inventário de Dados Pessoais: data mapping completo — 33 campos em 9 entidades |
| 3 | Bases Legais: 4 bases (consentimento, execução contratual, obrigação legal, legítimo interesse) × 14 tratamentos |
| 4 | Consentimento e Transparência: cadastro 3 níveis com consentimento progressivo, Política de Privacidade (Art. 9) |
| 5 | Direitos do Titular: 9 direitos Art. 18 com implementação, canal e prazo (15 dias) |
| 6 | Compartilhamento com Terceiros: 9 providers (todos USA-based), transferência internacional Art. 33 |
| 7 | Segurança dos Dados (Art. 46): referência cruzada com 4.3 — medidas técnicas/administrativas/monitoramento |
| 8 | Retenção e Eliminação: política por tipo de dado, prazos legais, processo de anonimização, jobs automáticos |
| 9 | Incidentes e Notificação (Art. 48): classificação P0-P3, notificação ANPD 2 dias úteis, titulares |
| 10 | RIPD (Art. 38): avaliação de risco baixo-médio para MVP, roadmap de RIPD completo |
| 11 | Cookies e Rastreamento: apenas cookies essenciais, PostHog cookieless (ADR-05), banner informativo |
| 12 | Pendências Jurídicas: 10 itens (PJ-01 a PJ-10) priorizados por fase |
| 13 | Rastreabilidade: seção × RNFs × RNs × Artigos LGPD × artefatos |

### Cobertura

- **Privacidade (RNF-05.01 a 05.08):** 8/8 endereçados ✅
- **Regras de negócio:** RN-01.07, RN-01.13, RN-09.02 ✅
- **Artigos LGPD cobertos:** 18 artigos (Art. 5-50) ✅
- **Pendências jurídicas:** 10 itens, 4 bloqueantes para lançamento ✅

### Fase 4 — Status

| Artefato | Nome | Status |
|----------|------|--------|
| 4.1 | Projeção de Custos Operacionais | ✅ |
| 4.2 | Projeção Financeira Técnica | ✅ |
| 4.3 | Política de Segurança | ✅ |
| 4.4 | Compliance LGPD | ✅ |
| 4.5 | Roadmap de Desenvolvimento | ✅ |

---

## 37. Roadmap de Desenvolvimento (Fase 4 — quinto artefato, último)

O artefato 4.5 traduz toda a documentação técnica (Fases 1–4) em um plano de execução temporal de 18 meses.

### Conteúdo

| Seção | Conteúdo |
|-------|----------|
| §1 Premissas | Velocity 24–38 SP/sprint (1 dev + IA), buffer 30%, início Abr/2026 |
| §2 Fase 1: MVP | 7 sprints (S0–S6), 153 SP, 41 US, 22 UCs, 75 componentes, 13 semanas |
| §3 Fase 2: Validação | S7–S12, 40 SP, 10 US, meta 2K suppliers |
| §4 Fase 3: Monetização | S13–S18, 51 SP, 12 US, Stripe + créditos + leads |
| §5 Fase 4: Tração | S19–S24, backlog emergente, PWA + IA |
| §6 Fase 5: Escala | S25–S36, 13 SP (WhatsApp) + emergente, 30K+ suppliers |
| §7 Gantt | Diagrama Mermaid com 5 fases + milestones |
| §8 Milestones/KPIs | 11 milestones de MVP Live (M3) a R$100K MRR (M18) |
| §9 Dependências | 8 dependências críticas (D-01 a D-08) + 7 riscos (R-01 a R-07) |
| §10 Go/No-Go | 22 critérios objetivos por transição de fase |
| §11 Roadmap Paralelo | Atividades não-dev de Gustavo/Márcio/Vitor mês a mês |
| §12 Rastreabilidade | 64/64 US, 33/33 UCs, 104/104 componentes, 13 artefatos-fonte |

### Números-chave

- **257 SP totais** em 64 user stories (153 MVP + 40 VAL + 51 MON + 13 ESC)
- **104 componentes** em 9 domínios (75 MVP + 5 VAL + 23 MON + 0 TRA + 1 ESC)
- **~36 sprints** de 2 semanas ao longo de 18 meses
- **MVP Live:** ~4 Julho 2026 (Semana 13)
- **Primeiro pagante:** Outubro 2026 (M7)
- **Break-even infra:** Outubro 2026 (5–10 assinantes)
- **R$100K MRR:** Setembro 2027 (M18, cenário base)

### Correções de coerência aplicadas

1. REFERENCIA §22: SP MVP 154 → **153**, total 258 → **257** (soma real do 2.2)
2. REFERENCIA §29: componentes [MON] 22 → **23** (tabela real do 3.1)
3. 2.1 tabela-índice: UC-06 em MVP → **Validação** (consistente com body text do UC)