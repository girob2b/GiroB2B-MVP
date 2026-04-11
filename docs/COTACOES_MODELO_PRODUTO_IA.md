# Modelo de produto - Cotacoes, propostas e IA

Data: 2026-04-11

Este documento registra a decisao de produto para reestruturar a area de cotacoes do GiroB2B. Ele foi escrito para uma proxima IA continuar a implementacao com o menor risco possivel.

## Problema atual

- A pagina de cotacoes criada inicialmente em `/painel/inquiries` existia, mas ainda estava simples demais para o produto que o Vitor quer construir.
- A navegacao tambem ficou conceitualmente duplicada para usuario com perfil `both`: a mesma rota aparecia em Comprador e Fornecedor.
- A palavra "cotacao" esta sendo usada para coisas diferentes: pedido do comprador, proposta do fornecedor, analise comparativa e chat/negociacao.

Antes de desenvolver mais, separar esses conceitos.

Atualizacao de implementacao em 2026-04-11:

- A duplicidade no menu para usuario `both` foi corrigida em `apps/web/components/layout/dashboard-shell.tsx`.
- `/painel/inquiries` foi refatorada para uma Central de Cotacoes com abas via query string: `received`, `sent`, `research`, `analysis`.
- A aba `received` lista cotações recebidas pelo fornecedor.
- A aba `sent` lista cotações enviadas pelo comprador.
- As abas `research` e `analysis` ainda são estados de roadmap, sem tabelas novas.
- Nenhuma migration nova foi aplicada nesta etapa.
- O fluxo inicial de "Negociar direto" foi iniciado no Explorar. Como `PRODUTOS_MOCK` ainda nao possui `supplierId` e `productId` reais do banco, o formulario salva um rascunho em `sessionStorage` e abre `/painel/chat` com contexto via query string. Quando a busca passar a usar produtos reais com UUIDs, o mesmo codigo tenta criar a inquiry via `POST /inquiries`.

## Decisao de produto

Cotacoes no GiroB2B nao devem ser apenas uma caixa de mensagens. Elas devem virar um motor de decisao de compra B2B.

O melhor caminho e um modelo hibrido:

- Codigo proprio calcula dados objetivos e auditaveis.
- IA interpreta esses dados, explica riscos, sugere perguntas e recomenda a melhor opcao.
- A IA nao deve ser a unica fonte de verdade da decisao.

Motivo: em compra B2B, a recomendacao precisa ser rastreavel. Preco, prazo, frete, localizacao, estoque, origem e quantidade devem ser comparaveis em estrutura fixa antes da IA dar uma conclusao.

## Glossario obrigatorio

Use estes nomes no codigo e no produto sempre que possivel:

- **Inquiry / Pedido de cotacao**: intencao inicial do comprador.
- **Proposal / Proposta**: resposta/oferta de um fornecedor para uma inquiry.
- **Negotiation / Negociacao**: historico de contrapropostas, aceite, recusa e chat.
- **Quote analysis / Analise de cotacao**: comparacao estruturada entre propostas/produtos.
- **Buying research / Pesquisa de compra**: fluxo em que o comprador seleciona varios produtos/materiais para uma analise profunda.

Evitar colocar tudo dentro de "chat". O chat deve ser canal de conversa, nao o estado principal da negociacao.

## Fluxo 1 - Negociacao direta

Objetivo: comprador encontra um produto no Explorar e abre uma proposta direta para aquele fornecedor.

Fluxo:

1. Comprador entra em `/painel/explorar`.
2. Seleciona produto/fornecedor.
3. Informa:
   - quantidade desejada;
   - preco alvo;
   - prazo desejado;
   - tipo de material/especificacao;
   - observacoes;
   - preferencia de frete, se houver.
4. Sistema cria uma inquiry direcionada para o fornecedor.
5. Sistema abre ou vincula um chat de negociacao.
6. Fornecedor pode:
   - aceitar proposta;
   - recusar proposta;
   - enviar contraproposta.
7. Comprador pode aceitar contraproposta ou enviar nova versao.
8. Quando houver aceite, seguir para o proximo fluxo transacional, ainda a definir.

Recomendacao tecnica:

- Persistir cada versao de proposta em tabela propria.
- Nao depender apenas de mensagens de chat para saber o preco/prazo atual.
- O chat pode referenciar uma `proposal_id` ou `negotiation_id`.

Estados sugeridos:

```text
draft -> sent -> viewed -> countered -> accepted
                      \-> rejected
                      \-> expired
                      \-> cancelled
```

## Fluxo 2 - Pesquisa profunda com IA

Objetivo: comprador seleciona varios produtos/materiais e cria uma pesquisa de compra comparativa.

Fluxo:

1. Comprador entra no Explorar.
2. Seleciona varios produtos/materiais/fornecedores.
3. Define parametros de compra:
   - segmento da empresa;
   - localizacao desejada;
   - quantidade de compra;
   - tipo de material;
   - estoque minimo esperado;
   - importacao ou mercado nacional;
   - quem paga frete;
   - transportadora ou frete proprio;
   - prazo maximo;
   - preco alvo ou teto de preco;
   - peso de cada criterio, se for configuravel.
4. Sistema cria uma `buying_research`.
5. Codigo calcula score objetivo por opcao/proposta.
6. IA gera uma leitura executiva:
   - melhor opcao;
   - por que ela e melhor;
   - riscos;
   - quais informacoes faltam;
   - perguntas sugeridas ao fornecedor;
   - contraproposta recomendada.

Importante:

- A primeira versao pode funcionar sem IA, usando score em codigo.
- A IA deve entrar depois como camada de explicacao/recomendacao.
- O futuro "agente de IA" deve ser configurado pelo comprador com limites objetivos.

## Criterios de avaliacao

Critérios mínimos para comparar propostas:

- Segmento da empresa.
- Localizacao do fornecedor.
- Distancia/estado/cidade e impacto logistico.
- Quantidade de compra.
- Tipo de material e compatibilidade com a necessidade.
- Estoque disponivel.
- Origem: importacao ou mercado nacional.
- Prazo de entrega.
- Preco unitario.
- Preco total estimado.
- Quem paga frete.
- Tipo de frete: transportadora, proprio, retirada, FOB/CIF se aplicavel.
- Confiabilidade do fornecedor.
- Plano/verificacao do fornecedor, se fizer sentido no ranking.
- Historico de resposta/negociacao quando existir.

Score inicial sugerido:

```text
score_total =
  preco_score * 0.25 +
  prazo_score * 0.20 +
  frete_logistica_score * 0.20 +
  estoque_score * 0.15 +
  compatibilidade_material_score * 0.10 +
  confiabilidade_fornecedor_score * 0.10
```

Esse peso deve ser configuravel futuramente por comprador/agente. No MVP, pode ser fixo.

## Modelo de dados sugerido

Nao aplicar tudo de uma vez sem revisar migrations. Isto e uma direcao.

### `inquiries`

Continuar representando o pedido inicial do comprador.

Campos importantes ja alinhados nos tipos:

- `inquiry_type`: `directed` ou `generic`
- `buyer_id`
- `supplier_id`
- `product_id`
- `category_id`
- `description`
- `quantity_estimate`
- `desired_deadline`
- `buyer_city`
- `buyer_state`
- `status`: `new`, `viewed`, `responded`, `archived`, `reported`

### `proposals`

Tabela nova sugerida.

Campos:

- `id`
- `inquiry_id`
- `supplier_id`
- `buyer_id`
- `product_id`
- `status`
- `version`
- `quantity`
- `unit_price_cents`
- `target_price_cents`
- `total_price_cents`
- `currency`
- `available_stock`
- `lead_time_days`
- `material_type`
- `origin_type`: `national` ou `imported`
- `freight_payer`: `buyer`, `supplier`, `split`, `unknown`
- `freight_type`: `carrier`, `own_freight`, `pickup`, `unknown`
- `notes`
- `expires_at`
- `created_at`
- `updated_at`

### `negotiations`

Tabela nova sugerida para agrupar chat e propostas.

Campos:

- `id`
- `inquiry_id`
- `buyer_id`
- `supplier_id`
- `status`
- `accepted_proposal_id`
- `created_at`
- `updated_at`

### `buying_researches`

Tabela nova sugerida para pesquisa profunda.

Campos:

- `id`
- `buyer_id`
- `title`
- `status`
- `criteria_json`
- `ai_enabled`
- `created_at`
- `updated_at`

### `buying_research_items`

Tabela nova sugerida para os produtos/fornecedores escolhidos.

Campos:

- `id`
- `research_id`
- `product_id`
- `supplier_id`
- `inquiry_id`
- `proposal_id`
- `manual_snapshot_json`
- `score_json`
- `created_at`

### `quote_analyses`

Tabela nova sugerida para guardar o resultado da analise.

Campos:

- `id`
- `research_id`
- `buyer_id`
- `analysis_type`
- `input_snapshot_json`
- `score_result_json`
- `ai_summary`
- `ai_risks`
- `ai_recommendation`
- `created_at`

## UX recomendada

### Central de Cotacoes

Rota unica:

- `/painel/inquiries`

Abas sugeridas:

- `Recebidas`: fornecedor ve pedidos recebidos.
- `Enviadas`: comprador ve pedidos enviados.
- `Pesquisas`: comprador ve pesquisas profundas.
- `Analises`: comprador ve resultados comparativos/IA.

Para usuario `both`, nao duplicar item no menu. Mostrar uma entrada unica "Cotacoes" e resolver dentro da pagina com abas.

### CTA no Explorar

Cada produto deve ter duas acoes diferentes:

- `Negociar direto`: abre fluxo de proposta direta.
- `Adicionar a pesquisa`: adiciona item ao carrinho/lista de pesquisa profunda.

Evitar misturar isso com "Comparador" antigo se ele for apenas visual. O comparador deve virar ou alimentar `buying_research`.

## IA - arquitetura futura

Nao comecar com agente autonomo negociando.

Fases:

1. **Score em codigo**: comparacao deterministica.
2. **IA explicativa**: resume a melhor opcao e riscos.
3. **IA assistente de negociacao**: sugere contrapropostas.
4. **Agente configuravel**: comprador define limites e a IA pode executar acoes permitidas.

Parametros obrigatorios do agente futuro:

- preco maximo;
- quantidade minima/maxima;
- prazo maximo;
- regioes aceitas;
- origem aceita: nacional/importado/ambos;
- frete aceito;
- limite de numero de fornecedores contatados;
- necessidade de aprovacao humana antes de enviar proposta final.

## Ordem de implementacao recomendada

1. [feito em 2026-04-11] Corrigir duplicidade da navegacao de cotacoes para usuario `both`.
2. [feito em 2026-04-11] Refatorar `/painel/inquiries` para Central de Cotacoes com abas.
3. [feito em 2026-04-11] Criar modelo visual de cards/listas separando `Recebidas` e `Enviadas`.
4. [parcial em 2026-04-11] Implementar fluxo "Negociar direto" no Explorar.
5. Criar tabela/estrutura de `proposals` e `negotiations`.
6. Vincular chat a negociacao, sem deixar o chat ser a fonte principal do estado.
7. Criar "Adicionar a pesquisa" no Explorar.
8. Criar `buying_researches` e `buying_research_items`.
9. Implementar score deterministico em codigo.
10. Depois integrar IA para explicacao e recomendacao.

Detalhe do item 4:

- Arquivo: `apps/web/app/(dashboard)/painel/explorar/_components/explorer-search.tsx`.
- Foi criado um formulario estruturado no modal do produto com quantidade, preco alvo, prazo, tipo de material, origem, quem paga frete, tipo de frete e observacoes.
- Arquivo: `apps/web/app/(dashboard)/painel/chat/page.tsx`.
- O chat agora reconhece os parametros `negociar`, `produto`, `fornecedor`, `quantidade`, `preco` e `prazo` e mostra um card de "Rascunho de negociacao direta".
- Limite: ainda nao existe tabela `proposals`; o chat continua placeholder. A proxima IA deve transformar esse rascunho em estrutura persistida.

## Nao fazer agora

- Nao implementar agente autonomo antes de ter propostas estruturadas.
- Nao colocar logica de preco/prazo apenas em mensagens de chat.
- Nao criar varias rotas duplicadas de cotacao.
- Nao assumir que credits/pagamentos ja existem.
- Nao transformar pesquisa profunda em chat generico; ela precisa de dados comparaveis.

## Relacao com documentos de negocio

Este modelo respeita:

- RN-04 em `../BASE/google-drive/1.6_REGRAS_DE_NEGOCIO.md`
- Seção 6 de Inquiries em `../BASE/google-drive/1.7_DEFINICAO_MVP_SCOPE_LOCK.md`

Ele expande a implementacao futura, mas preserva o MVP: primeiro inquiry direcionada, depois comparacao e IA.
