# Comparador de Cotações — visão de produto (pós-pivot)

> Status: rascunho / visão · Atualizado: 2026-06-27 · **NÃO construir ainda**
> Pré-requisito do Vitor: "tem muito a ajustar na plataforma antes de iniciar uma feature tão grande."
>
> **Relação com `COTACOES_MODELO_PRODUTO_IA.md` (2026-04-11):** aquele doc é o ancestral
> pré-pivot. Este **supersede o fluxo de entrada** dele (lá a entrada era o comprador
> escolhendo produtos no *Explorar*; aqui a entrada é a **demanda** que o comprador já
> posta, no modelo buyer-first/feed-first atual). **Carrega adiante** dali: score
> ponderado, pesos configuráveis pelo comprador, e o faseamento "score determinístico em
> código → IA explicativa depois". Conecta com o modelo de oferta/proposta híbrida atual
> (ver memory `project_offer_inbox_model`).

## Em uma frase

Transformar o contato vendedor→comprador num **motor de decisão**: o vendedor (que **paga
pra contatar**) envia uma **cotação estruturada**, o comprador recebe **todas** as cotações
de uma demanda no painel e **compara** lado a lado, com um ranking que **ele mesmo configura**
(o que "ganha": preço, prazo, proximidade, reputação).

## Problema

- Hoje o card de demanda tem só **"Contatar via WhatsApp"**. O contato sai da plataforma
  e some — o comprador não compara ofertas lado a lado, e a gente perde o dado.
- Cada vendedor manda preço/prazo solto no WhatsApp; o comprador vira um **agregador
  manual de mensagens**. Não escala e não gera decisão rastreável.
- Em compra B2B a decisão precisa ser **comparável e auditável** (preço, prazo, frete,
  localização), não um amontoado de chats. (Mesma tese do doc de 2026-04-11.)

## O que é

Um vendedor, ao ver uma demanda no feed, em vez de só abrir o WhatsApp, preenche uma
**cotação estruturada** (preço, prazo, condições de pagamento que aceita, observação).
Essa cotação vira um **objeto on-platform comparável** que cai no inbox do comprador
("ofertas recebidas"). O comprador abre o **comparador** daquela demanda e vê todas as
cotações **ranqueadas por um score** calculado a partir de **pesos que ele definiu** no
perfil. Escolhida a melhor, ele aciona o contato pra fechar.

## Como conversa com o que já existe

- **Evolui o modelo de oferta/proposta híbrida** (`project_offer_inbox_model`): hoje o
  vendedor monta uma oferta (preço/prazo) que vira registro on-platform **+** abre WhatsApp;
  os dois lados já têm inbox (vendedor "propostas enviadas" / comprador "ofertas
  recebidas"). A cotação interna é o **próximo degrau**: a oferta deixa de *terminar* no
  WhatsApp e passa a ser um **objeto comparável** dentro do painel.
- **Diferença central vs. doc 2026-04-11:** lá a entrada era o comprador selecionando
  **produtos no Explorar**; aqui a entrada é a **demanda** (o comprador já posta a
  necessidade; o vendedor **responde à demanda**, não a um produto). Mantém o buyer-first.

## Monetização — o vendedor paga pra contatar

> **Atualização 2026-06-27 — SEM checkout próprio.** Decidido NÃO construir checkout/sistema
> de pagamento próprio agora. O **gate continua sendo o de vendedor ativo que JÁ existe**
> (`subscription_status`, aprovação via admin/waitlist) — a cotação herda exatamente o mesmo
> gate do botão de contato atual. A cobrança real (plano/franquia) fica **desacoplada e
> adiada** (futura ou via provedor externo). A visão abaixo descreve o destino; a
> implementação atual NÃO depende de checkout.

Mecânica central (define o resto): **quem paga é o VENDEDOR, e ele paga pra entrar em
contato com o comprador** — por qualquer canal. O comprador continua **de graça** (posta
demanda, recebe cotações, compara — buyer-first preservado, ver
`project_buyer_friction_principle`).

- **Modelo (visão futura): plano/assinatura.** No destino, o vendedor assina um plano mensal
  com **franquia de X contatos**. **Hoje NÃO se constrói o checkout** — usa-se o gate de
  vendedor ativo já existente; a cobrança vem depois (ou via provedor externo).
- **1 contato = 1 comprador, não 1 canal.** Gastar 1 da franquia **desbloqueia o contato
  com aquele comprador/demanda** — e isso libera **tanto a cotação quanto o WhatsApp**
  daquele comprador. O vendedor **não paga 2x** pelo mesmo lead.
- **WhatsApp não é escape grátis.** Ele continua existindo, mas atrás do **mesmo contato
  pago** — é só um canal alternativo do contato que o vendedor já liberou.
- **Consequência boa:** como contatar custa franquia, **só vendedor sério cota** → menos
  spam, cotação de maior intenção (resolve o risco de spam quase de graça).
- **Consequência a vigiar:** cada cotação "custa" do plano do vendedor → pode haver **menos
  cotações por demanda**. O comparador precisa de massa suficiente — depende de base de
  vendedores em plano ativo.

## Decisões tomadas (rodada 2026-06-27)

1. **Cotação é o CTA primário do card; WhatsApp não some, só muda de lugar.** No card de
   demanda o **1º botão = "Enviar cotação"** (on-platform, comparável). O **WhatsApp sai do
   card** e vai pro **detalhe/perfil que abre ao clicar** na demanda. Os dois canais ficam
   atrás do **mesmo contato pago** (ver Monetização).

2. **Gate de vendedor ativo (SEM checkout próprio).** A cotação fica atrás do mesmo gate de
   vendedor ativo (`subscription_status`) que já trava o contato hoje — sem construir página
   de pagamento. Cobrança real (plano/franquia) adiada/externa. Comprador 100% grátis.

3. **Ranking por pesos multi-fator (score configurável pelo comprador).** Cada cotação
   recebe um score = soma ponderada dos fatores; **os pesos são definidos pelo comprador**
   (ex: preço 50%, distância 30%, prazo 20%). É o diferencial real — o comprador decide o
   que importa pra ele. (O doc de 2026-04-11 já previa pesos configuráveis; aqui vira feature
   de primeira classe.)

4. **Fatores do v1: preço, prazo de entrega, distância/localização, reputação da empresa.**
   (Reputação depende de um sistema de rating que ainda não existe — ver Dependências.)

5. **Proximidade por região / raio metropolitano** — não cidade exata, nem CEP/km. Mesma
   região metropolitana > mesmo estado > outro estado. Suficiente pro v1 com o dado de
   cidade/estado que já temos; CEP/km fica pro futuro.

6. **Condição de pagamento = preferência/filtro, NÃO fator de score.** Pagamento é
   **categórico** (à vista / cartão parcelado / boleto / etc.), não uma escala absoluta como
   preço — não dá pra ranquear num peso. Então: o comprador **declara a preferência** de
   pagamento, o vendedor **indica quais condições aceita**, e isso entra como **match/filtro
   ou desempate**, nunca como nota ponderada. Decisão explícita de **NÃO** entrar em
   avaliação financeira (SPC/Serasa/crédito) — fora de escopo, dor de cabeça desnecessária.

## Modelo de ranking

- **Score** de cada cotação = soma ponderada dos fatores normalizados, com **pesos do
  comprador** (default sensato se ele não configurar nada).
- Fatores e direção:
  - **Preço** — menor = melhor (normaliza contra o range das cotações *daquela* demanda).
  - **Prazo de entrega** — menor = melhor.
  - **Distância (região)** — mesma região metropolitana > mesmo estado > outro estado.
  - **Reputação** — depende de rating (não existe ainda). No v1 pode ser **aproximada** por:
    empresa verificada + perfil opt-in completo + histórico de resposta.
- **Pagamento** entra **fora do score**: filtro/match (marca "aceita sua preferência" ou
  desempata), nunca nota.
- **Faseamento de IA (herdado do doc 2026-04-11):** começar com **score determinístico em
  código** (rastreável). **IA explicativa** ("por que essa ganhou, riscos, o que falta
  perguntar ao fornecedor") só numa fase posterior, como camada por cima do score — nunca
  como única fonte da decisão.

## Fluxo (visão)

1. Comprador posta a **demanda** (já existe hoje). De graça.
2. Vendedor vê a demanda no feed. **1º botão = "Enviar cotação"**.
3. Pra contatar, o vendedor **gasta 1 contato da franquia do plano** (precisa de plano
   ativo). Isso **desbloqueia aquele comprador** — cotação **e** WhatsApp.
4. Vendedor preenche a **cotação estruturada**: preço, prazo, condições de pagamento que
   aceita, observação (e, no futuro, origem/frete como no doc antigo).
5. A cotação vira **registro on-platform** → cai no inbox "ofertas recebidas" do comprador.
6. No **detalhe/perfil** que abre ao clicar na demanda, o vendedor (já desbloqueado) também
   tem o **botão de WhatsApp** como canal alternativo do mesmo contato.
7. Comprador abre o **comparador** da demanda: todas as cotações lado a lado, **ranqueadas**
   pelo score com os **pesos dele** → escolhe.

## UI (direção — não construir agora)

- **Card de demanda:** **1º botão = "Enviar cotação"** (CTA primário, lado do vendedor). O
  **WhatsApp sai do card**. *(Foi o gatilho original desta ideia.)*
- **Detalhe/perfil da demanda (abre ao clicar):** aqui mora o **botão de WhatsApp** —
  liberado junto com a cotação quando o vendedor gasta o contato do plano.
- **Painel do comprador:** uma view de **comparador** por demanda (tabela/cards ranqueados,
  com o score e o porquê visíveis).
- **Perfil do comprador:** configuração dos **pesos de preferência** + **preferência de
  pagamento**.

## Escopo v1 (quando for a hora)

- Vendedor **ativo** (gate existente, sem checkout novo) envia a cotação → desbloqueia o
  comprador (cotação + WhatsApp).
- Vendedor envia cotação estruturada (preço, prazo, pagamento aceito, obs) respondendo a uma
  demanda.
- Comprador vê **todas** as cotações de uma demanda no comparador.
- Ranking por score com **pesos configuráveis** (preço, prazo, distância-região); reputação
  **aproximada** por verificação/histórico.
- Preferência de pagamento como filtro/match (não score).

## Fora do v1 (futuro)

- IA explicativa / recomendação (fases 2+ do doc 2026-04-11).
- Rating real de fornecedor.
- Distância por CEP / km.
- Negociação / contraproposta estruturada (estados `draft → sent → countered → accepted`).
- Agente de IA configurável (limites de preço/prazo/região definidos pelo comprador).

## Dependências

- **Cobrança real / planos do vendedor** — DESACOPLADA do MVP da feature (sem checkout
  próprio agora). O gate usado é o de vendedor ativo já existente. Cobrança fica pra fase
  futura (ou provedor externo).
- **Sistema de reputação/rating** — pré-requisito pro fator "reputação" valer de verdade.
- **Mapa cidade → região metropolitana** — tabela ou lib pra calcular proximidade.
- **Plataforma estabilizada** — bloqueador explícito do Vitor antes de começar.
- **Modelo de dados** — decidir o que se aproveita do doc 2026-04-11 (`proposals`,
  `negotiations`, etc.), adaptado de produto→demanda.

## Perguntas em aberto

- A cotação responde **sempre** a uma demanda existente, ou o vendedor pode cotar
  proativamente sem demanda? (Provável: sempre via demanda, pra manter buyer-first.)
- Cotação **expira**? Vendedor pode revisar/reenviar **sem gastar outro contato**?
- Pesos: o comprador configura **globais** (perfil) ou **por demanda**?
- Reputação no v1: usa verificação/histórico como proxy, ou espera o rating real?
- **Planos:** quantos contatos por tier? Tem avulso/créditos extras quando estoura a
  franquia? Contato consumido é **reembolsado** se o comprador nunca responder?
- O contato desbloqueado **expira** (ex: 30 dias) ou é vitalício pra aquele comprador?

## Riscos / incertezas

- **Massa crítica vs. custo do contato:** cada cotação consome franquia do plano do vendedor
  → pode haver **poucas cotações por demanda**, e o comparador só tem valor com **várias**.
  Depende de uma base saudável de vendedores em plano ativo. **É a tensão central.**
- **Atrito do formulário:** a cotação já custa um contato; se o formulário ainda for
  **lento/pesado**, o vendedor desiste. Como ele já pagou, espera que seja rápido.
- **Complexidade de config:** pesos multi-fator podem confundir o comprador. Precisa de
  **defaults bons** + UI simples (talvez presets "mais barato"/"mais perto"/"mais rápido"
  além do custom).
- *(Deixaram de ser risco: "spam de cotação" e "canibalizar o WhatsApp" — o pagamento do
  vendedor resolve os dois; o WhatsApp também é pago, não é escape grátis.)*

## Próximos passos

- [ ] Seguir ajustando a plataforma (pré-requisito do Vitor).
- [ ] (Futuro/desacoplado) cobrança real do vendedor — **sem checkout próprio** no MVP da feature.
- [ ] Definir o sistema de reputação (dependência do fator reputação).
- [ ] Quando for a hora: revisar este doc + decidir o modelo de dados → `/dev-build`.

## Log de refinamento

Rodada 2026-06-27 (a) — ranking:
- **P:** Cotação interna vs WhatsApp — papel de cada um? · **R:** Cotação principal.
- **P:** Como o comprador configura o que "ganha"? · **R:** Pesos multi-fator (score).
- **P:** Fatores do v1? · **R:** Preço, prazo, distância, reputação. **Pagamento NÃO é fator
  de score** (categórico, não absoluto) — vira preferência/filtro; sem SPC/Serasa.
- **P:** Como medir proximidade? · **R:** Região / raio metropolitano.

Rodada 2026-06-27 (b) — monetização:
- **Correção do Vitor:** WhatsApp **não sai** do produto, só do card; vai pro detalhe/perfil
  que abre ao clicar. 1º botão do card = "Enviar cotação".
- **P:** Como o vendedor paga pra contatar? · **R:** **Plano/assinatura** (franquia de X
  contatos).
- **P:** O pagamento libera o quê? · **R:** **O contato com aquele comprador** — cotação E
  WhatsApp juntos (1 lead = 1 cobrança, não por canal).
