> ⚠️ **DOCUMENTO PARCIALMENTE SUPERADO** — A especificação de templates de atributos por categoria descrita aqui pressupõe vendedor publicando produtos. Com o pivô para reverse marketplace (2026-05-07), o vendedor não publica produtos no MVP. Esta spec pode reaparecer em fase 2 se decidirmos oferecer página de fornecedor pública. Ver `docs/today/MVP_PIVOT_2026-05-07.md` como fonte de verdade do MVP.

# Especificacao do Catalogo Multi-Setorial — GiroB2B

> **Audiencia primaria:** Vitor (CTO) — spec de implementacao.
> **Audiencia secundaria:** stakeholders externos que queiram profundidade alem do Plano v3 §5.5.
> **Fonte de dados:** A-PRO-05 (varredura de 44 categorias de produto na IndiaMART via Chrome MCP, 01-02/05/2026).
> **Decisoes trancadas:** D8-D12 (02/05/2026, aprovadas pelo CEO em bloco). Ver Handbook §2.6.
> **Estado:** v1 — 2026-05-04.

---

## Sumario

1. [Arquitetura do sistema de catalogo](#1-arquitetura-do-sistema-de-catalogo)
2. [Taxonomia seed](#2-taxonomia-seed)
3. [Templates de atributos por categoria](#3-templates-de-atributos-por-categoria)
4. [Normalizacao de unidades e dimensionamento](#4-normalizacao-de-unidades-e-dimensionamento)
5. [Photo guidelines por vertical](#5-photo-guidelines-por-vertical)
6. [Priorizacao de implementacao](#6-priorizacao-de-implementacao)

---

# 1 Arquitetura do sistema de catalogo

## 1.1 Principio fundamental

A varredura de 44 categorias de produto na IndiaMART revelou que **nao existem atributos universais entre todas as verticais**. Ate "Material", inicialmente considerado universal, quebra em quimicos (substituido por Formula Quimica), farmacos (substituido por Composicao) e agricultura (nao aplicavel). A GiroB2B precisa de sistema de atributos **flexivel por categoria**, nao de colunas fixas no banco de dados.

## 1.2 Decisao de schema

A GiroB2B adota **templates de atributos por categoria folha (leaf-level)** com armazenamento em **par chave-valor flexivel**. Cada categoria folha define seu proprio template: quais atributos estao disponiveis, qual o tipo de cada um, e quais sao obrigatorios versus opcionais. Fornecedor preenche os atributos relevantes pro produto dele; campos opcionais ficam vazios sem penalizacao.

Essa arquitetura espelha o que a IndiaMART opera em escala de 119 milhoes de produtos com especificacao.

## 1.3 Schema SQL conceitual

### Tabela `products` (extensoes sobre ERD 2.5 existente)

Duas colunas novas na tabela `products` existente:

```sql
-- Adicionar ao products existente (migration)
ALTER TABLE products
  ADD COLUMN attributes JSONB DEFAULT NULL,
  ADD COLUMN variant_parent_id UUID REFERENCES products(id) DEFAULT NULL;

-- Index GIN pra queries em atributos
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);

-- Index pra variantes
CREATE INDEX idx_products_variant_parent ON products (variant_parent_id)
  WHERE variant_parent_id IS NOT NULL;
```

A coluna `attributes` armazena os atributos de dominio do produto como JSONB. Exemplo:

```json
{
  "material": "Aco Inox 304",
  "tamanho_rosca": "M10",
  "diametro_mm": 10,
  "acabamento": "Zincado",
  "grau": "8.8",
  "certificacoes": ["ISO 8673", "DIN 934"]
}
```

A coluna `variant_parent_id` e T1 schema-prepared: nullable, sem UI no MVP, ativada no T2 quando catalogos crescerem.

### Tabela `categories` (extensao de 2 para 4 niveis)

```sql
-- Alterar constraint de nivel
ALTER TABLE categories
  DROP CONSTRAINT chk_categories_level,
  ADD CONSTRAINT chk_categories_level CHECK (level BETWEEN 1 AND 4);
```

Estrutura de 4 niveis:
- **Nivel 1:** Mega-categoria (ex: "Materiais e Quimica")
- **Nivel 2:** Categoria (ex: "Metais e Ligas")
- **Nivel 3:** Sub-categoria (ex: "Fios e Barras")
- **Nivel 4:** Folha (ex: "Fio de Cobre") — onde o template de atributos vive

### Nova tabela `category_attribute_templates`

```sql
CREATE TABLE category_attribute_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id),
  attribute_key VARCHAR(100) NOT NULL,
  display_name_pt VARCHAR(200) NOT NULL,
  attribute_type attribute_type_enum NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  help_text TEXT DEFAULT NULL,
  default_unit VARCHAR(50) DEFAULT NULL,
  allowed_values JSONB DEFAULT NULL,
  show_on_card BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unq_template_category_key UNIQUE (category_id, attribute_key)
);

CREATE TYPE attribute_type_enum AS ENUM (
  'text',
  'number',
  'boolean',
  'range',
  'list'
);
```

Campos:
- `attribute_key`: identificador programatico (ex: `material`, `tamanho_rosca`)
- `display_name_pt`: label pro usuario em PT-BR (ex: "Material", "Tamanho da Rosca")
- `attribute_type`: um dos 5 tipos suportados
- `is_required`: se o campo e obrigatorio no cadastro
- `display_order`: ordem de exibicao no formulario
- `help_text`: orientacao pro fornecedor (ex: "Informe o diametro em milimetros")
- `default_unit`: unidade padrao (ex: "mm", "kg")
- `allowed_values`: para tipo `list`, array de opcoes validas. Para tipo `range`, `{"min_label": "De", "max_label": "Ate", "unit": "mm"}`
- `show_on_card`: se este atributo aparece no card de listagem (2-4 atributos por categoria)

### Nova tabela `product_certifications` (muitos-para-muitos)

```sql
CREATE TABLE product_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  certification_name VARCHAR(200) NOT NULL,
  certification_body VARCHAR(200) DEFAULT NULL,
  expiry_date DATE DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unq_product_cert UNIQUE (product_id, certification_name)
);

CREATE INDEX idx_product_certifications_product ON product_certifications (product_id);
CREATE INDEX idx_product_certifications_name ON product_certifications (certification_name);
```

## 1.4 Tipos de atributo

| Tipo | Armazenamento JSONB | Exemplo | Uso |
|------|---------------------|---------|-----|
| `text` | `"valor string"` | `"Aco Inox 304"` | Material, cor, acabamento, marca |
| `number` | `42` ou `42.5` | `10` (mm) | Diametro, peso, voltagem, capacidade |
| `boolean` | `true` / `false` | `true` (impermeavel) | Feature flags (Sim/Nao) |
| `range` | `{"min": 5, "max": 50}` | Faixa de temperatura -20 a 60°C | Ranges dimensionais, tolerancias |
| `list` | `["A", "B", "C"]` | `["ISO 9001", "CE"]` | Certificacoes, materiais multiplos |

## 1.5 Fluxo de cadastro do produto

1. Fornecedor seleciona categoria folha (nivel 4) no formulario
2. Sistema carrega template de atributos daquela categoria via `category_attribute_templates`
3. Formulario renderiza campos dinamicos: obrigatorios com asterisco, opcionais sem
4. Fornecedor preenche os campos relevantes pro produto
5. Sistema valida tipos e campos obrigatorios
6. Atributos salvos como JSONB na coluna `products.attributes`
7. Campos marcados `show_on_card = true` exibidos no card de listagem

## 1.6 Validacao

A validacao acontece em 2 camadas:
- **Backend (Fastify):** ao receber `POST /products` ou `PATCH /products/:id`, carrega template da categoria, valida tipos e campos obrigatorios. Rejeita com 400 se falhar.
- **Frontend (Next.js):** formulario dinamico ja filtra tipos no input (number input pra `number`, checkbox pra `boolean`, select pra `list`). Validacao visual em tempo real.

Campos **opcionais** nunca bloqueiam o cadastro. Fornecedor pode voltar e preencher depois.

---

# 2 Taxonomia seed

## 2.1 Principios da taxonomia

- **4 niveis:** mega-categoria -> categoria -> sub-categoria -> folha
- **Folha e onde o template vive.** Templates nunca em niveis acima da folha (siblings divergem — ex: Texteis/Fios vs Texteis/Vestuario tem ZERO overlap de atributos)
- **Seed inicial ~60-80 folhas** cobrindo as 44 verticais pesquisadas + expansao natural
- **Nomes em PT-BR** com slug em EN pra URL SEO
- **Expansivel:** novas categorias entram sem migracao de banco (so INSERT em `categories` + `category_attribute_templates`)

## 2.2 Arvore de categorias seed

```
1. Materiais e Quimica
   1.1 Metais e Ligas
       1.1.1 Fixadores (parafusos, porcas, arruelas)
       1.1.2 Fios e Barras de Cobre
       1.1.3 Chapas e Perfis de Aco
   1.2 Quimicos e Solventes
       1.2.1 Quimicos Industriais (soda caustica, acidos)
   1.3 Borracha e Plasticos
       1.3.1 Chapas e Perfis de Borracha
   1.4 Pedras e Revestimentos
       1.4.1 Marmore e Granito

2. Maquinas e Equipamentos Industriais
   2.1 Maquinas-Ferramenta
       2.1.1 Tornos CNC e Convencionais
   2.2 Equipamentos Hidraulicos
       2.2.1 Bombas Hidraulicas
       2.2.2 Valvulas Industriais
   2.3 Compressores
       2.3.1 Compressores de Ar (parafuso, pistao)
   2.4 Equipamentos de Embalagem
       2.4.1 Maquinas de Embalagem (flow wrap, seladora)
   2.5 Energia Solar e Renovavel
       2.5.1 Paineis Solares Fotovoltaicos
   2.6 Tratamento de Agua
       2.6.1 Sistemas de Osmose Reversa

3. Eletrica e Eletronica
   3.1 Equipamentos Eletricos
       3.1.1 Disjuntores e Quadros Eletricos
   3.2 Componentes Eletronicos
       3.2.1 Capacitores, Resistores e Semicondutores
   3.3 Seguranca e CFTV
       3.3.1 Cameras e Sistemas CFTV
   3.4 Telecomunicacoes
       3.4.1 Cabos de Fibra Optica

4. Texteis e Vestuario
   4.1 Tecidos e Malhas
       4.1.1 Tecidos de Algodao
   4.2 Fios e Fibras
       4.2.1 Fios de Poliester
   4.3 Cama, Mesa e Banho
       4.3.1 Roupas de Cama (lencois, fronhas)

5. Alimentos e Bebidas
   5.1 Graos e Cereais
       5.1.1 Arroz (basmati, agulhinha)
   5.2 Alimentos Processados
       (expansao futura)

6. Saude e Farmaceutico
   6.1 Medicamentos
       6.1.1 Medicamentos Genericos e de Marca
   6.2 Equipamentos Hospitalares
       6.2.1 Instrumentos Cirurgicos
   6.3 Produtos Naturais e Fitoterapicos
       6.3.1 Oleos Essenciais e Fitoterapicos

7. Moveis e Decoracao
   7.1 Moveis Corporativos
       7.1.1 Cadeiras e Mesas de Escritorio
   7.2 Artesanato e Decoracao
       7.2.1 Artesanato em Madeira

8. Automotivo e Pecas
   8.1 Pecas Automotivas
       8.1.1 Pecas de Freio e Suspensao
   8.2 Bicicletas e Pecas
       8.2.1 Bicicletas (urbanas, mountain bike, e-bikes)

9. Construcao Civil
   9.1 Materiais de Construcao
       9.1.1 Tubos de Aco e Conexoes
   (expansao: cimento, tintas, ferragens)

10. Esporte e Lazer
    10.1 Equipamentos Esportivos
        10.1.1 Equipamentos de Cricket e Tacos
    (expansao: fitness, camping)

11. Beleza e Cuidados Pessoais
    11.1 Cosmeticos
        11.1.1 Cremes e Tratamentos Faciais
    (expansao: cabelo, maquiagem)

12. Moda e Acessorios
    12.1 Acessorios de Couro
        12.1.1 Cintos e Carteiras de Couro
    12.2 Joias e Bijuterias
        12.2.1 Colares e Pulseiras de Prata

13. Papelaria e Escritorio
    13.1 Papel e Impressao
        13.1.1 Papel Sulfite e Copiativo
    13.2 Material de Escritorio
        (expansao futura)

14. Informatica e TI
    14.1 Perifericos
        14.1.1 Mouses, Teclados e Acessorios

15. Ferramentas
    15.1 Ferramentas Manuais
        15.1.1 Chaves e Ferramentas de Aperto
    15.2 Instrumentos de Laboratorio
        15.2.1 Medidores e Analisadores

16. Seguranca do Trabalho (EPI)
    16.1 Equipamentos de Protecao Individual
        16.1.1 Capacetes, Luvas e Protecao

17. Malas e Bolsas
    17.1 Malas de Viagem
        17.1.1 Malas e Bolsas de Viagem

18. Agricultura e Agropecuaria
    18.1 Maquinas Agricolas
        18.1.1 Pulverizadores e Irrigacao
    (expansao: sementes, fertilizantes)

19. Utilidades Domesticas
    19.1 Utensilios de Cozinha
        19.1.1 Panelas e Utensilios
    19.2 Utilidades Gerais
        19.2.1 Utensilios de Limpeza e Organizacao
```

**Total seed:** 19 mega-categorias, ~45 categorias, ~48 folhas. Cobre as 44 verticais pesquisadas com margem pra expansao organica.

---

# 3 Templates de atributos por categoria

> Templates extraidos da varredura de 44 verticais (A-PRO-05). Cada tabela define os atributos disponiveis na categoria folha, com tipo e obrigatoriedade. Fornecedor preenche o que for relevante pro produto — campos opcionais nao bloqueiam cadastro.
>
> **Convencao:** "Obrig. = Sim" significa que o campo aparece com asterisco e o backend rejeita se vazio. "Obrig. = Nao" significa que aparece no formulario mas nao bloqueia.
>
> **`show_on_card`** indica quais atributos aparecem no card de listagem (maximo 4 por categoria).

## 3.1 Materiais e Quimica

### 1. Fixadores (Fasteners)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Tamanho da Rosca | text | Sim | M8, M10 |
| Diametro | number | Sim | 8mm, 10mm |
| Material | text | Sim | SS304, Aco Carbono |
| Acabamento | text | Nao | Zincado, Galvanizado a Fogo |
| Tipo de Cabeca | text | Sim | Sextavada, Panela, Escareada |
| Tipo de Fenda | text | Nao | Phillips, Fenda |
| Comprimento | number | Sim | 25mm, 50mm |
| Classe/Grau | text | Sim | 8.8, 10.9, A2-70 |

- **Unidade de Venda:** Peca (ou Kg para granel)
- **MOQ tipico:** 100-10.000 Pecas

---

### 4. Quimicos / Soda Caustica (Chemicals — Caustic Soda)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Grau | text | Sim | Industrial |
| Pureza | number | Sim | 95-98% |
| Tamanho da Embalagem | number | Sim | 50 Kg |
| Tipo de Embalagem | text | Nao | Tambor |
| Formula Quimica | text | Sim | NaOH |
| Numero CAS | text | Sim | 1310-73-2 |
| Uso/Aplicacao | text | Nao | Neutralizacao, Limpeza, Sintese |
| Estado Fisico | text | Sim | Solido, Liquido, Po, Flocos |
| Sinonimos | text | Nao | Soda Caustica |
| Marca | text | Nao | Triveni Chemicals |

- **Unidade de Venda:** Kg (sempre por peso)
- **MOQ tipico:** 50-25.000 Kg

---

### 8. Construcao Civil / Tubo de Aco (Building & Construction — Steel Pipe)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Tamanho (Diametro Externo) | range | Sim | 20-200 MM OD |
| Grau do Aco | text | Sim | EN 10219 S235JRH |
| Material (Composicao Quimica) | text | Sim | C/Si/Mn/P/S percentuais |
| Comprimento Unitario | range | Sim | 6m a 11m customizavel |
| Acabamento de Extremidade | text | Nao | Corte mecanico, acabamento de usina |
| Acabamento de Superficie | text | Nao | Preto sem tratamento |
| Tolerancia de Retidao | text | Nao | Min 1:200 do comprimento |
| Tolerancia de Torcao | text | Nao | Max 2mm +/- 0.05mm/m |

- **Unidade de Venda:** Kg
- **MOQ tipico:** 5-1.000 Kg

---

### 15. Metais, Ligas e Minerais / Fio de Cobre (Metals, Alloys & Minerals — Copper Wire Rod)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Diametro | range | Sim | 0.02 - 1 mm |
| Bitola (Wire Gauge) | text | Sim | 0-5, AWG, SWG |
| Material | text | Sim | Cobre |
| Uso/Aplicacao | text | Nao | Industrial |
| Tipo de Embalagem | text | Nao | Rolo |
| Acabamento | text | Nao | Polido, Sem Polimento, Anodizado |
| Dureza | text | Nao | 90-160 HB (Brinell) |
| Diametro Externo | number | Nao | 5mm (para tubos ocos) |
| Cor | text | Nao | Dourado |

- **Unidade de Venda:** Kg
- **MOQ tipico:** Granel

---

### 43. Produtos de Borracha / Chapa de Borracha (Rubber Products — Rubber Sheet)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Espessura | range | Sim | 1mm a 50mm |
| Resistencia a Tracao | text | Sim | 2 a 3 MPa |
| Uso/Aplicacao | list | Nao | Material de Vedacao, Juntas, Revestimento de Piso |
| Material (composto) | text | Sim | NR/SBR |
| Tipo de Embalagem | list | Nao | Rolo |
| Caracteristicas | list | Nao | Inodoro, Resistente ao Desgaste |
| Formato | list | Nao | Retangular |
| Densidade | text | Nao | 1,6 a 1,7 g/cc |
| Alongamento | number | Nao | 250% |
| Cor | text | Nao | Preto |

**Unidade de venda:** Kg / Metro / Peca
**MOQ:** varia
**Obs:** Atributos de ciencia de materiais (Tracao MPa, Densidade g/cc, Alongamento %) sao propriedades ensaiadas em laboratorio. Material como composto (NR/SBR = blenda), nao enum simples.

---

## 3.2 Maquinas e Equipamentos Industriais

### 5. Maquinas Industriais / Torno CNC (Industrial Machinery — CNC Lathe)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Comprimento Maximo de Torneamento | number | Sim | 200mm |
| Diametro Maximo de Torneamento | number | Sim | 500mm |
| Area de Trabalho XY | text | Sim | 300 x 300 mm |
| Marca | text | Nao | Bhavya |
| Frequencia | text | Nao | 50 Hz |
| Fase Eletrica | text | Sim | Monofasico, Trifasico |
| Velocidade do Fuso | number | Nao | RPM |
| Potencia do Motor | number | Nao | kW |
| Peso | number | Nao | Kg |

- **Unidade de Venda:** Unidade
- **MOQ tipico:** 1 (equipamento de capital)

---

### 37. Maquinas de Embalagem / Maquina Flow Wrap (Packaging Machines — Flow Wrap Machine)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Grau de Automacao | list | Sim | Automatico |
| Tipo de Selagem | text | Sim | Selagem 3 lados |
| Velocidade de Embalagem | text | Sim | Ate 3000 pecas/hora |
| Frequencia | number | Nao | 50 Hz |
| Tensao | text | Sim | 220V |
| Fase | list | Nao | Trifasico |
| Consumo de Energia | number | Nao | 3 kW |
| Dimensoes da Maquina | text | Nao | 25 mm x 450 mm (L x C) |
| Material do Corpo Principal | text | Nao | Aco Carbono |
| Controlador de Temperatura | text | Nao | PID |
| Tamanho do Pacote (faixa) | text | Nao | C 100-350mm, L 90-450mm, A 10-100mm |
| Material de Embalagem Aceito | text | Nao | Papel laminado termosselavel |

**Unidade de venda:** Peca (a maquina em si)
**MOQ:** 1 (equipamento pesado)

---

### 39. Bomba Hidraulica (Hydraulic Pump)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Fonte de Energia | list | Sim | Alimentacao DC |
| Grau de Automacao | list | Nao | Semi Automatico |
| Potencia do Motor (HP) | number | Sim | 3 HP |
| Pressao | number | Sim | 100 Bar |
| Vazao | number | Sim | 70 LPM |
| Velocidade do Motor | number | Nao | 3000 RPM |
| Tipo de Bomba | list | Sim | Centrifuga |
| Altura Manometrica (Head) | number | Nao | 50 Metros |
| Material | text | Nao | Ferro Fundido Cinza |
| Numero da Peca (Part No.) | text | Nao | 02428992 |
| Instalacao/Pos-Venda | boolean | Nao | Fornecido |
| Uso/Aplicacao | list | Nao | Industrial |

**Unidade de venda:** Peca
**MOQ:** varia
**Obs:** Pressao em Bar (padrao) ou psi. Vazao em LPM. Altura manometrica e conceito tecnico = capacidade de elevacao vertical da bomba.

---

### 40. Valvula Industrial / Valvula Borboleta (Industrial Valve — Butterfly Valve)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Tamanho da Valvula | text | Sim | 4,0 polegadas |
| Grau de Automacao | list | Nao | Semi Automatico |
| Tipo de Conexao | list | Sim | Flangeada |
| Meio (fluido) | list | Sim | Gas |
| Material | text | Sim | WCB / SS316 / SS2205 |
| Pressao Maxima | text | Sim | Classe 150-2500 (285-4000 psi / 20-275 bar) |
| Temperatura Maxima | text | Nao | 450-1200 F (232-649 C) |
| Faixa de Tamanho | range | Nao | 1" a 24" |
| Marca | text | Nao | Flowcen |

**Unidade de venda:** Peca
**MOQ:** varia
**Obs:** Pressao usa padrao ASME (Classe) + unidades fisicas duplas (psi e bar). Tipo de conexao determina compatibilidade fisica.

---

### 41. Compressor de Ar / Compressor Parafuso (Air Compressor — Screw Compressor)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Potencia (HP) | range | Sim | 10-75 HP |
| Tecnologia do Compressor | list | Sim | Compressor de Parafuso |
| Pressao Maxima de Trabalho | text | Sim | 13 bar (188 psig) |
| Vazao Maxima | text | Sim | 20 cfm |
| Configuracao | list | Nao | Montado em Tanque c/ Secador |
| Fonte de Energia | list | Sim | AC Trifasico |
| Pressao de Descarga | number | Nao | 13 Bar |
| Capacidade do Tanque de Ar | number | Nao | 1000 L |
| Potencia do Motor (kW) | number | Nao | 37 kW |
| Marca | text | Nao | Evolution |
| Tipo de Resfriamento | list | Nao | Refrigerado a Ar |
| Pecas de Reposicao Disponiveis | boolean | Nao | Sim |

**Unidade de venda:** Unidade
**MOQ:** varia
**Obs:** Potencia aparece em HP e kW (unidades duplas). Faixa de preco 100x+ dentro da categoria (R$ 2,8K a R$ 314K).

---

### 42. Energia Solar e Renovavel / Modulo Fotovoltaico (Solar & PV — Solar Module)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Potencia (Wattage) | range | Sim | 540-555 W |
| Tipo de Painel | list | Sim | Half Cut Mono |
| Eficiencia do Modulo | number | Sim | 21% |
| Tecnologia | list | Sim | Mono PERC |
| Numero de Celulas | number | Nao | 96 |
| Tensao do Sistema | number | Nao | 48 V |
| Aplicacao | list | Nao | Comercial, Residencial, Industrial |
| Dimensoes (C x L x A) | text | Nao | 2284 mm x 1136 mm x 35 mm |
| Garantia | text | Nao | 25 Anos |
| Capacidade | text | Nao | 5 kW / 10 kW |
| Marca | text | Nao | Waaree |

**Unidade de venda:** Peca / Watt / kW (4 unidades diferentes na mesma categoria!)
**MOQ:** varia
**Obs:** Unidade de venda e a MAIS fragmentada de todas as 44 verticais. Necessaria canonicalizacao + fator de conversao.

---

### 44. Tratamento de Agua / Estacao de Osmose Reversa (Water Treatment — RO Plant)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Capacidade da Estacao | number | Sim | 500 LPH |
| Tipo de Fonte de Agua | list | Sim | Agua de Poco Artesiano |
| Grau de Automacao | list | Sim | Semi Automatico / Automatico |
| Estagios de Tratamento | list | Nao | Tratamento Preliminar |
| pH (faixa) | range | Nao | 6 a 9 |
| Vazao de Entrada | text | Nao | 1000 m3/hora |
| Marca | text | Nao | Aqua N |
| Antiferrugem | boolean | Nao | Sim |
| Aplicacao | list | Nao | Tratamento de Esgoto |
| Condicao | list | Nao | Novo |

**Unidade de venda:** Unidade
**MOQ:** varia
**Obs:** Capacidade em LPH (Litros Por Hora) — unidade de vazao especifica do dominio. Tipo de fonte de agua e filtro CRITICO (determina design da estacao inteira). Faixa de preco 360x (R$ 560 a R$ 201K).

---

## 3.3 Eletrica e Eletronica

### 3. Eletronicos / Capacitores (Electronics — Capacitors)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Tipo de Capacitor | text | Sim | Eletrolitico de Aluminio |
| Material | text | Sim | Aluminio |
| Terminais | text | Nao | Fio |
| Marca | text | Nao | Indtech |
| Tensao Nominal | number | Sim | 450V |
| Dimensoes | text | Nao | 50x120 |
| Capacitancia (MFD) | number | Sim | 72 MFD |
| Frequencia | text | Nao | 50/60Hz |
| Classificacao kVAR | number | Nao | 50 Kvar |
| Aplicacao | text | Nao | Ar Condicionado, Motor |

- **Unidade de Venda:** Peca / Unidade
- **MOQ tipico:** 10-100

---

### 27. Sistemas de Seguranca / Camera CCTV (Security Systems — CCTV Camera)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Resolucao da Camera | list | Sim | 5 MP |
| Alcance da Camera | number | Sim | 20 m |
| Sensor | list | Sim | CMOS |
| Uso/Aplicacao | list | Nao | Externo |
| Visao da Camera | list | Nao | Dia e Noite |
| Tipo de Camera | list | Sim | Bullet |
| Tecnologia da Camera | list | Nao | HD / IP |
| Resolucao Maxima (pixels) | text | Nao | 2688 x 1520 |
| Armazenamento HD | text | Nao | 1 TB |
| Codec de Video | list | Nao | H.265 |
| Temperatura de Operacao | range | Nao | +0 a +40 C |
| Marca | text | Nao | Hikvision |

**Unidade de venda:** Peca / Conjunto / Unidade (camera individual OU sistema completo com DVR/NVR + cabos)
**MOQ:** 10-100

---

### 29. Telecomunicacoes / Cabo de Fibra Optica (Telecom — Fiber Optic Cable)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Numero de Nucleos | number | Sim | 6 |
| Tipo de Cabo | list | Sim | Sem Blindagem |
| Comprimento do Cabo | number | Sim | 1 Km |
| Tipo de Modo | list | Sim | Monomodo |
| Diametro | text | Sim | 5,3 +/- 0,3 mm |
| Material da Capa | list | Nao | HDPE |
| Temperatura de Operacao | range | Nao | -40 C a +70 C |
| Temperatura de Armazenamento | range | Nao | -40 C a +60 C |
| Raio de Curvatura | text | Nao | 20 D |
| Pais de Origem | text | Nao | Made in India |
| Marca | text | Nao | Finolex |

**Unidade de venda:** Metro (dominante) / Peca
**MOQ:** 100-1000 Metro

---

### 35. Componentes Eletronicos / Capacitor SMD (Electronics Components — SMD Capacitor)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Numero do Modelo / Part Number | text | Sim | :104 |
| Marca | text | Nao | Embeddinator |
| Tipo de Montagem | list | Sim | SMD/SMT |
| Uso/Aplicacao | list | Nao | Industrial |
| Formato | list | Nao | Retangular |
| Acabamento de Superficie | text | Nao | Polido |
| Capacitancia | text | Nao | 0,1uF |
| Tipo de Componente | text | Nao | Capacitor de Filme |
| Numero de Pinos | number | Nao | 20 |
| Potencia | text | Nao | 100W |

**Unidade de venda:** Peca
**MOQ:** varia amplamente
**Obs:** Part Number e o identificador critico — compradores buscam por numero exato. Sub-tipos (capacitor, resistor, CI, conector, transistor) divergem fortemente nos atributos.

---

### 36. Equipamentos Eletricos / Disjuntor (Electrical Equipment — Circuit Breaker)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Marca | text | Sim | L&T |
| Numero de Polos | list | Sim | 2 Polos |
| Fase | list | Sim | Trifasico |
| Corrente Nominal | number | Sim | 1250 A |
| Tensao | text | Sim | 220-240V AC |
| Modelo | text | Nao | L&T Residual Current Circuit Breaker |
| Numero de Catalogo (CAT No) | text | Nao | BG202503 |
| Material | text | Nao | Borracha / Aco Carbono |
| Tipo Automatico | list | Nao | Semi Automatico |
| Uso/Aplicacao | text | Nao | Quadro de Distribuicao |
| Condicao | list | Nao | Novo |

**Unidade de venda:** Peca
**MOQ:** varia

---

## 3.4 Texteis e Vestuario

### 2. Texteis / Tecidos (Textiles — Cotton Fabric)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Largura (Panna) | number | Sim | 44 polegadas |
| Tipo de Tecido | text | Sim | Tecidos Basicos Tingiveis |
| Estampa/Padrao | text | Nao | Block Print, Tie Dye |
| Composicao | text | Sim | 100% Algodao |
| Material | text | Sim | Algodao |
| Uso/Aplicacao | text | Nao | Vestuario |
| Instrucoes de Lavagem | text | Nao | Lavar a mao com agua fria |
| Cor | text | Nao | Indigo |
| Estacao | text | Nao | Verao |
| GSM | number | Sim | 90, 240 |
| Construcao/Qualidade | text | Nao | 60x60 |

- **Unidade de Venda:** Metro (tecido em rolo), Peca (pecas prontas)
- **MOQ tipico:** 5-5.000 Metros (tecido); 50-100 Pecas (vestuario)

---

### 21. Fios e Fibras Texteis (Textiles, Yarn & Fabrics — Polyester Yarn)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Titulo (Count) | number | Sim | 50 (sistema Ne) |
| Material | text | Sim | Poliester |
| Cor | text | Nao | Branco |
| Padrao | text | Nao | Liso |
| Brilho (Lustre) | text | Nao | Brilhante, Semi-Fosco, Fosco |
| CSP (Produto Contagem-Resistencia) | text | Nao | 60 Lea |
| Denier | number | Nao | 2000D |
| Numero de Cabos (Ply) | number | Nao | 2 |
| Tecnica de Fiacao | text | Nao | Anel (Ring Spun), Open End |
| Forma do Fio | text | Nao | Filamento, Fibra Cortada |
| Tamanho da Embalagem | text | Nao | Quilograma |
| Tipo de Embalagem | text | Nao | Rolo |
| Marca | text | Nao | Annapoorna Cotspin |

- **Unidade de Venda:** Kg
- **MOQ tipico:** Granel (suprimento industrial)

---

### 23. Textil para Casa / Lencol (Home Textile — Bed Sheet)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Tamanho da Cama | list | Sim | Queen Size |
| Padrao/Estampa | text | Nao | Liso |
| Material | text | Sim | Algodao Puro |
| Cor | text | Nao | Multicolorido |
| Pais de Origem | text | Nao | Made in India |
| Contagem de Fios (TC) | number | Sim | 250 TC |
| Uso/Aplicacao | text | Nao | Hospitalar |

**Unidade de venda:** Peca / Conjunto (lencol + 2 fronhas)
**MOQ:** bulk

---

## 3.5 Alimentos e Bebidas

### 7. Alimentos e Bebidas / Arroz Basmati (Food & Beverages — Basmati Rice)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Variedade | text | Sim | 1509, 1121, 1401 |
| Tipo de Processamento | text | Sim | White Sella, Cru, Vapor |
| Tamanho da Embalagem | number | Sim | 50 Kg |
| Tipo de Embalagem | text | Nao | Saco PP, Saco de Juta |
| Comprimento do Grao (AGL) | number | Sim | 8.40mm |
| Percentual de Quebrados | number | Sim | 1% Max |
| Pais de Origem | text | Nao | India |

- **Unidade de Venda:** Kg / Tonelada (normalizacao necessaria)
- **MOQ tipico:** 25 Kg a 25.000 Toneladas

---

## 3.6 Saude e Farmaceutico

### 9. Farmacos e Medicamentos (Drugs & Pharmaceuticals — Tablet)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Tipo de Embalagem | text | Nao | Strips, Caixa |
| Dose/Concentracao | text | Sim | 3.125mg |
| Aplicacao Terapeutica | text | Sim | Analgesico, Anti-Infeccioso |
| Marca | text | Sim | Sun Pharma |
| Tipo de Medicina | text | Sim | Alopatico, Ayurvedico, Homeopatico |
| Forma do Medicamento | text | Sim | Comprimido, Capsula, Xarope |
| Composicao (Principio Ativo) | text | Sim | Carvedilol |
| Nome Generico | text | Sim | Carvedilol |
| Prescricao/Venda Livre | boolean | Sim | Prescricao |
| Classe Terapeutica | text | Nao | Analgesico |
| Grau/Padrao | text | Nao | Grau Farmaceutico |
| Tamanho da Embalagem | text | Nao | 50 Comprimidos |

- **Unidade de Venda:** Strip / Caixa (normalizacao necessaria)
- **MOQ tipico:** 10-50

---

### 10. Hospital e Diagnostico / Instrumentos Cirurgicos (Hospital & Diagnostics — Surgical Instruments)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Descartavel | boolean | Sim | Sim / Nao (Reutilizavel) |
| Material | text | Sim | Aco Inoxidavel |
| Grau do Material | text | Nao | 316L, 420 |
| Uso/Especialidade Medica | text | Sim | Ortopedia, Oftalmologia, ORL |
| Tipo de Equipamento | text | Sim | Instrumento Cirurgico |
| Marca | text | Nao | ASCO, Alis |
| Pais de Origem | text | Nao | India |

- **Unidade de Venda:** Conjunto (Set) / Peca
- **MOQ tipico:** 1-10

---

### 26. Produtos Herbais e Ayurvedicos / Oleo Essencial (Herbal & Ayurvedic — Essential Oil)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Forma | list | Sim | Liquido |
| Tipo de Embalagem | list | Nao | Frasco |
| Tamanho da Embalagem | text | Sim | 15ml |
| Parte da Planta Utilizada | text | Sim | Folhas |
| Uso/Aplicacao | list | Nao | Aromaterapia |
| Nome Botanico | text | Sim | Melaleuca alternifolia |
| Metodo de Extracao | list | Sim | Destilacao a Vapor |
| Validade | text | Sim | 24 Meses |
| Pureza | number | Sim | 100% |
| Fabricante | text | Nao | ASG Mantra |
| Tipo de Oleo | list | Nao | Oleo Essencial |

**Unidade de venda:** Frasco / Kg
**MOQ:** varia (varejo Frasco a granel Kg)

---

## 3.7 Moveis e Decoracao

### 6. Moveis / Cadeira de Escritorio (Furniture — Office Chair)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Tipo de Encosto | text | Sim | Alto, Medio, Baixo |
| Tipo de Cadeira | text | Sim | Gerente, Executivo, Visitante |
| Material do Estofamento | text | Sim | Mesh, Couro, Tecido |
| Material da Base | text | Sim | Aluminio, Nylon, Aco |
| Mecanismo | text | Nao | Push Back, Synchro Tilt |
| Cor | text | Nao | Preto |
| Garantia | text | Nao | 1 Ano |
| Recursos | list | Nao | Apoio de Pes, Apoio de Braco, Encosto de Cabeca |
| Marca | text | Nao | Labycare |
| Modelo | text | Nao | SKSSOF182 |

- **Unidade de Venda:** Peca
- **MOQ tipico:** 50-100 Pecas

---

### 17. Artesanato e Decoracao (Handicrafts & Decoratives — Wooden Handicraft)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Tipo de Artesanato | text | Sim | Peca Antiga, Decoracao, Enfeite |
| Uso/Aplicacao | text | Nao | Decoracao |
| Design/Estilo | text | Sim | Antigo, Moderno, Tradicional |
| Material | text | Sim | Madeira |
| Cor | text | Nao | Dourado |
| Marca | text | Nao | Neer |
| Pais de Origem | text | Nao | India |

- **Unidade de Venda:** Peca
- **MOQ tipico:** Pequenos lotes (artesanal)
- **Nota:** Vertical com menor quantidade de atributos estruturados. Qualidade das fotos mais importante que completude de atributos.

---

## 3.8 Automotivo e Pecas

### 11. Automoveis, Pecas e Reposicao (Automobile, Parts & Spares — Brake Pad)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Montadora (Fabricante do Veiculo) | text | Sim | Maruti Suzuki |
| Modelo do Veiculo | text | Sim | Swift |
| Posicao de Instalacao | text | Sim | Dianteiro, Traseiro, Conjunto |
| Material | text | Sim | Ceramico |
| Grau do Produto | text | Sim | OEM, OES, Pos-Venda |
| Tipo de Veiculo | text | Nao | Carro, Caminhao, Moto |
| Marca | text | Nao | MGP |
| Formato | text | Nao | Retangular |

- **Unidade de Venda:** Conjunto / Peca
- **MOQ tipico:** Negociado

---

### 33. Bicicletas e Pecas / Bicicleta de Montanha (Bicycle — Mountain Bike)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Material | text | Sim | Aluminio |
| Quadro | text | Sim | 29" Liga de Aluminio com Suspensao |
| Freio | text | Sim | Freio a Disco Hidraulico Tektro |
| Garfo (Suspensao) | text | Nao | 29" SANTOUR, 100mm curso |
| Tamanho da Roda | text | Sim | 26 polegadas / 26T |
| Marca | text | Nao | Dynem |
| Modelo | text | Nao | M019D |
| Cor | text | Nao | Amarelo |
| Motor (e-bike) | text | Nao | Motor traseiro 48V 500W |
| Bateria (e-bike) | text | Nao | 48V 12,75AH |
| Display (e-bike) | text | Nao | Display LCD |
| Uso/Aplicacao | list | Nao | Mountain Bike |
| Numero de Assentos | number | Nao | 1 |

**Unidade de venda:** Peca
**MOQ:** 4-50 Pecas
**Obs:** Atributos de e-bike (Motor, Bateria, Display) sao opcionais — so relevantes para bicicletas eletricas.

---

## 3.9 Esporte e Lazer

### 28. Artigos Esportivos / Taco de Cricket (Sports Goods — Cricket Bat)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Grau do Willow | list | Sim | Grau 1 |
| Tipo de Willow | list | Sim | English Willow |
| Material | text | Sim | Madeira |
| Tipo de Cabo | list | Nao | Cabo Longo |
| Peso do Taco | list | Nao | Leve |
| Tipo de Jogador | list | Sim | Intermediario |
| Uso/Aplicacao | text | Nao | Cricket |
| Numero de Veios | list | Nao | 1-4 |
| Tamanho do Taco | list | Nao | Tamanho Completo |
| Tipo de Bola Compativel | list | Nao | Bola de Couro |

**Unidade de venda:** Peca
**MOQ:** 5-10 Pecas

---

## 3.10 Beleza e Cuidados Pessoais

### 19. Cosmeticos e Cuidados Pessoais (Cosmetics & Personal Care — Face Cream)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Preocupacao/Indicacao | list | Sim | Rugas, Anti-Idade, Acne, Manchas |
| Tipo de Pele | text | Sim | Todos os Tipos, Seca, Oleosa |
| Ingredientes Principais | list | Sim | Aloe Vera, Neem, Curcuma, Manteiga de Karite |
| Forma | text | Sim | Creme, Gel, Serum |
| Tamanho da Embalagem | number | Sim | 50g |
| Tipo de Embalagem | text | Nao | Pote, Tubo |
| Genero | text | Nao | Unissex, Feminino, Masculino |
| Horario de Uso | text | Nao | Dia, Noite, Dia e Noite |
| Livre de Parabenos | boolean | Nao | Sim |
| Validade | text | Nao | 24 meses |

- **Unidade de Venda:** Peca / Pacote
- **MOQ tipico:** Pequeno (por marca)

---

## 3.11 Moda e Acessorios

### 20. Joias e Gemas (Gems, Jewelry & Astrology — Silver Necklace)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Pureza | text | Sim | 925 Prata de Lei, 14K, 18K, 22K |
| Material | text | Sim | Prata de Lei 925 |
| Peso | number | Sim | 44.33 Gramas |
| Tamanho | text | Nao | Ajustavel |
| Tipo de Polimento | text | Nao | Banhado a Prata, Banhado a Ouro, Rodio |
| Tipo de Pedra | text | Nao | Granada, Turquesa, Onix |
| Formato (Lapidacao) | text | Nao | Oval, Gota, Redondo, Cabochao |
| Cor | text | Nao | Prata |
| Ocasiao | text | Nao | Casual, Festa, Casamento |
| Genero | text | Nao | Unissex, Feminino |
| Modelo/Numero | text | Nao | SAC11262 |
| Pais de Origem | text | Nao | India |

- **Unidade de Venda:** Conjunto / Peca / Grama (4 representacoes distintas — mais diverso de todos)
- **MOQ tipico:** Variavel (1 peca alto valor, granel para atacado)
- **Nota:** Preco por grama e modelo unico de precificacao nesta vertical.

---

### 25. Acessorios de Moda / Cinto de Couro (Fashion Accessories — Leather Belt)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Tipo de Couro | list | Sim | Couro Legitimo |
| Genero | list | Sim | Masculino |
| Cor | text | Nao | Marrom |
| Ocasiao | list | Nao | Casual |
| Tamanho (cintura) | number | Sim | 34 |
| Marca | text | Nao | Y. S. International |
| Qualidade do Couro | list | Nao | Couro Legitimo |
| Material do Cinto | text | Nao | Couro |

**Unidade de venda:** Peca
**MOQ:** bulk (exportacao)

---

### 34. Produtos de Couro / Carteira de Couro (Leather Products — Leather Wallet)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Material | text | Sim | Couro Legitimo |
| Tipo de Carteira | list | Sim | Bifold |
| Genero | list | Sim | Unissex |
| Tipo de Fechamento | list | Nao | Sem Fechamento |
| Cor | text | Nao | Preto |
| Compartimentos para Cartao | number | Nao | Ate 4 |
| Protecao RFID | boolean | Nao | Nao |
| Padrao/Estampa | text | Nao | Liso |
| Opcao de Personalizacao | list | Nao | Gravacao em Relevo |
| Dobravel | boolean | Nao | Sim |

**Unidade de venda:** Peca
**MOQ:** bulk (exportacao)

---

## 3.12 Papelaria e Escritorio

### 22. Papelaria e Livros (Books & Stationery — Notebook)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Numero de Paginas | number | Sim | 240 |
| Tamanho (Formato) | text | Sim | A4, A5, B5 |
| Tipo de Capa | text | Sim | Capa Dura, Capa Mole |
| Tipo de Encadernacao | text | Nao | Colagem, Espiral, Costura |
| Material da Capa | text | Nao | Papel, Tecido, Couro |
| GSM (Gramatura do Papel) | number | Sim | 45, 75, 90 |

- **Unidade de Venda:** Peca
- **MOQ tipico:** Granel (atacado/exportacao)

---

### 30. Papel e Produtos de Papel / Papel de Copia (Paper — Copier Paper)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Gramatura (GSM) | number | Sim | 80 GSM |
| Tamanho | list | Sim | A4 |
| Dimensoes | text | Nao | 210 mm x 297 mm |
| Tipo de Papel | list | Sim | Laser/Jato de Tinta/Fax |
| Material | text | Nao | 100% Polpa de Madeira Virgem |
| Folhas por Pacote | number | Nao | 500 |
| Tipo de Embalagem | text | Nao | 500 folhas por resma, 5 resmas por caixa |
| Marca | text | Nao | Double A |
| Espessura | number | Nao | 110 Um |
| Rugosidade | number | Nao | 140 ml/Min |

**Unidade de venda:** Resma (dominante) / Pacote / Kg / Ton
**MOQ:** 10-10.000 Resmas ou 20-500 Ton (exportacao granel)

---

## 3.13 Informatica e TI

### 24. Informatica e TI / Mouse (Computer & IT — Mouse)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Conectividade | list | Sim | Com Fio + Sem Fio |
| DPI Maximo | number | Sim | 1000 dpi |
| Tipo de Sensor | list | Sim | Optico Infravermelho |
| Interface | list | Nao | USB |
| Modelo | text | Nao | Prodot MU-253s |
| Tipo de Mouse | list | Nao | Com Fio |
| Marca | text | Nao | Prodot |

**Unidade de venda:** Peca
**MOQ:** varia

---

## 3.14 Ferramentas e Instrumentos

### 16. Ferramentas Manuais e Mecanicas / Chaves (Hand & Machine Tools — Wrenches)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Tipo de Ferramenta | text | Sim | Soquetes, Chaves, Alicates |
| Material | text | Sim | Aco Carbono |
| Uso/Aplicacao | text | Nao | Agricultura, Industrial |
| Dimensoes (L x W x H) | text | Nao | 855 x 72 x 47 mm |
| Codigo HSN | text | Nao | 8204, 8205 |
| Normas de Conformidade | text | Nao | CE, RoHS |
| Termos de Envio (Incoterms) | text | Nao | FOB, CIF, DDP |
| Marca Personalizada Disponivel | boolean | Nao | Sim |
| Cor | text | Nao | Prata |
| Marca | text | Nao | Jayati |
| Pais de Origem | text | Nao | India |

- **Unidade de Venda:** Peca / Conjunto
- **MOQ tipico:** Granel (orientado a exportacao)

---

### 38. Instrumentos de Laboratorio / Medidor de pH (Lab Instruments — pH Tester)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Categoria do Instrumento | list | Sim | Analitico |
| Tipo de Instrumento | list | Nao | Microscopio |
| Nivel de Uso | list | Sim | Laboratorio Escolar |
| Precisao | text | Sim | 0,01 pH |
| Modo de Operacao | list | Nao | Semi Automatico |
| Impermeavel | boolean | Nao | Sim |
| Material de Construcao | text | Nao | Aco Inox |
| Uso/Aplicacao | text | Nao | Laboratorio |
| Marca | text | Nao | PH testers |
| Modelo | text | Nao | Spectrum 2+ |
| Grau de Automacao | list | Nao | Automatico |

**Unidade de venda:** Peca / Unidade
**MOQ:** varia
**Obs:** Precisao tem unidade variavel por tipo de instrumento (pH, C, g). Faixa de preco extrema dentro da categoria (R$ 15 a R$ 33.647).

---

## 3.15 Seguranca do Trabalho

### 13. Suprimentos Industriais / Capacete de Seguranca (Industrial Supplies — Safety Helmet)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Cor | list | Nao | Branco, Amarelo, Vermelho |
| Material | text | Sim | Polipropileno, PVC, HDPE, ABS |
| Uso/Aplicacao | text | Nao | Industrial, Construcao, Oil & Gas |
| Tipo | text | Sim | Capacete Ratchet |
| Marca | text | Nao | My Corp |
| Tipo de Cinta | text | Nao | Ratchet, Pin-Lock, Nuca |
| Norma de Seguranca | text | Sim | BIS 2925, CE, ANSI Z89.1 |
| Condicao | text | Nao | Novo |
| Genero | text | Nao | Masculino |
| Faixa na Cabeca | boolean | Nao | Sim |
| Protecao de Cabeca | boolean | Nao | Sim |

- **Unidade de Venda:** Peca
- **MOQ tipico:** Negociado (granel)

---

## 3.16 Malas e Bolsas

### 31. Bolsas e Malas / Mala de Viagem (Bags — Leather Duffle Bag)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Material | text | Sim | PU |
| Tamanho | text | Sim | 20 polegadas |
| Numero de Rodas | list | Sim | Sem Rodas |
| Uso/Aplicacao | list | Nao | Presente Corporativo |
| Cor | text | Nao | Marrom |
| Capacidade (litros) | range | Nao | 20-30 L |
| Tipo de Fechamento | list | Nao | Ziper |
| Padrao/Estampa | text | Nao | Solido |
| Tipo de Couro | list | Nao | Couro de Cabra |
| Impermeavel | boolean | Nao | Sim |
| Dimensoes (C x L x A) | text | Nao | 21" x 11" x 9" |

**Unidade de venda:** Peca
**MOQ:** 10-100 Pecas

---

## 3.17 Agricultura e Agropecuaria

### 12. Agricultura e Agropecuaria (Agriculture & Farming — Sprayer Pump)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Fonte de Energia | text | Sim | Bateria, Manual, Gasolina, Solar |
| Capacidade do Tanque | number | Sim | 18L |
| Marca | text | Nao | Balwaan |
| Bateria | text | Nao | 12V 8AH |
| Aplicacao | text | Nao | Agricultura |
| Pressao de Operacao | number | Nao | 0.53 MPa |
| Vazao (Descarga) | number | Nao | 3.6 lt/min |
| Peso | number | Nao | 5.8 Kg |
| Pais de Origem | text | Nao | India |

- **Unidade de Venda:** Peca
- **MOQ tipico:** Nao exibido

---

## 3.18 Utilidades Domesticas

### 14. Utilidades Domesticas / Panelas (Housewares & Supplies — Cookware)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Material | text | Sim | Aco Inoxidavel |
| Cor | text | Nao | Prata |
| Padrao/Estampa | text | Nao | Liso, Estampado, Relevo |
| Formato | text | Nao | Redondo, Quadrado, Oval |
| Uso/Aplicacao | text | Nao | Presente, Cozinha |
| Marca | text | Nao | Mintage |
| Nome do Modelo | text | Nao | Mapple Gift Set |
| Conteudo da Embalagem | text | Nao | 3 panelas + 1 tampa |
| Compativel com Inducao | boolean | Nao | Sim |
| Grau Alimenticio | boolean | Nao | Sim |

- **Unidade de Venda:** Conjunto / Peca
- **MOQ tipico:** Granel

---

### 18. Utensilios de Cozinha e Eletrodomesticos (Kitchen Utensils & Appliances — Pressure Cooker)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Capacidade | number | Sim | 1.5L, 3L, 5L |
| Material | text | Sim | Aluminio, Aco Inoxidavel |
| Cor | text | Nao | Preto |
| Tipo de Embalagem | text | Nao | Caixa |
| Marca | text | Nao | Mintage |
| Uso/Aplicacao | text | Nao | Domestico |

- **Unidade de Venda:** Peca
- **MOQ tipico:** Granel

---

## 3.19 Pedras e Revestimentos

### 32. Marmore e Granito / Placa de Granito (Marble & Granite — Granite Slab)

| Atributo | Tipo | Obrig. | Exemplo |
|----------|------|--------|---------|
| Nome do Granito (variedade) | text | Sim | Black Galaxy |
| Acabamento de Superficie | list | Sim | Polido |
| Tipo de Polimento | list | Nao | Alto Brilho |
| Espessura | range | Sim | 15-20 mm |
| Forma | list | Sim | Placa |
| Area de Uso | list | Nao | Piso |
| Perfil de Borda | list | Nao | Reto |
| Cor | text | Nao | Azul Safira |
| Formato | list | Nao | Retangular |

**Unidade de venda:** Pe Quadrado (sq ft)
**MOQ:** 100-5000 pes quadrados
**Obs:** Tamanhos sao customizados (corte sob medida), nao ha tamanhos padrao.

---

# 4 Normalizacao de unidades e dimensionamento

## 4.1 Unidades de venda

A varredura identificou **18+ tipos de unidade de venda** com grafia inconsistente entre fornecedores. A plataforma precisa de normalizacao com sugestao por categoria.

### Tabela de unidades canonicas

| Unidade canonica | Variacoes aceitas | Categorias tipicas |
|------------------|-------------------|--------------------|
| Peca | Pca, Unidade, Un, Unit | Fixadores, eletrica, automotivo, EPI |
| Quilograma | Kg, Kilo, Kilogram | Quimicos, metais, alimentos |
| Tonelada | Ton, Tonne, t | Metais (bulk), quimicos (bulk) |
| Grama | g, Gram | Joias, cosmeticos, fitoterapicos |
| Metro | m, Meter | Texteis, cabos, tubos |
| Metro Quadrado | m2, sqm, Square Meter | Texteis (tecido), marmore/granito |
| Pe Quadrado | ft2, sqft, Square Feet | Marmore/granito (mercado US/IN) |
| Litro | L, lt, Liter | Tintas, quimicos liquidos, oleos |
| Conjunto | Set, Kit, Jogo | Instrumentos cirurgicos, utensilios, ferramentas |
| Caixa | Box, Cx | Papelaria, farmacos, alimentos processados |
| Resma | Ream | Papel (500 folhas = 1 resma) |
| Rolo | Roll | Texteis, cabos, fitas |
| Par | Pair | Calcados, luvas |
| Watt | W, Wp | Paineis solares |
| Ampere | A | Equipamentos eletricos |

### Regras de normalizacao

1. Ao cadastrar, fornecedor seleciona unidade de uma lista sugerida pela categoria
2. Se digitar variacao (ex: "Kg"), backend normaliza pra forma canonica ("Quilograma")
3. Categorias sugerem unidades padroes (ex: Fixadores sugere "Peca", Metais sugere "Quilograma" ou "Tonelada")
4. Unidade customizada permitida (campo livre) pra casos nao cobertos

## 4.2 Sistemas de dimensionamento

A varredura identificou **8 sistemas de dimensionamento** distintos. O campo "Tamanho" NAO pode ser generico — deve ser consciente da categoria.

| Sistema | Valores tipicos | Categorias |
|---------|-----------------|------------|
| Vestuario | P, M, G, GG ou S, M, L, XL | Texteis/vestuario |
| Cama | Solteiro, Casal, Queen, King | Cama, mesa e banho |
| Papel | A4, A5, B5, Carta, Oficio | Papelaria |
| Joias | Ajustavel, 16cm, 18cm | Joias e bijuterias |
| Moda (cintura) | 34, 36, 38, 40 (polegadas) | Cintos, calcas |
| Equipamentos (polegadas) | 1/2", 3/4", 1" | Tubos, valvulas, conexoes |
| Esportes (idade/altura) | Full Size, Size 6, Size 5 | Cricket, esportes |
| Bicicletas (aro) | 26", 29", 700c, 26T | Bicicletas |

### Implementacao

O campo de tamanho no template usa `attribute_type = 'list'` com `allowed_values` definidos por categoria. Exemplo pra Cama:

```json
{
  "attribute_key": "tamanho",
  "display_name_pt": "Tamanho",
  "attribute_type": "list",
  "allowed_values": ["Solteiro", "Casal", "Queen", "King", "Super King"],
  "is_required": true
}
```

---

# 5 Photo guidelines por vertical

A varredura revelou que requisitos de foto variam por tipo de produto. A GiroB2B nao bloqueia upload por descumprimento (decisao D11: T1 como recomendacao, nao bloqueio), mas exibe orientacao no formulario.

## 5.1 Diretrizes gerais

- **Resolucao minima recomendada:** 800x800px (IndiaMART exige 500x500)
- **Fundo recomendado:** branco ou neutro
- **Formato:** JPG ou PNG, max 5MB
- **Minimo recomendado:** 1 foto por produto; ideal 3-5

## 5.2 Diretrizes por tipo de vertical

| Tipo de vertical | Qtd ideal | Angulos recomendados | Exemplo de categorias |
|------------------|-----------|----------------------|-----------------------|
| **Componentes industriais** | 2-4 | Produto isolado + detalhe tecnico + escala (com regua/moeda) | Fixadores, eletrica, componentes eletronicos |
| **Maquinas e equipamentos** | 3-6 | Frontal + lateral + detalhe painel + operacao (se possivel) | CNC, compressores, embalagem, tratamento agua |
| **Texteis e vestuario** | 4-8 | Textura close-up + peca inteira + padrao/estampa + uso | Tecidos, roupas de cama, fios |
| **Alimentos e farmaceuticos** | 2-4 | Embalagem frente + verso (ingredientes/composicao) + produto aberto | Arroz, medicamentos, fitoterapicos |
| **Cosmeticos e beleza** | 3-5 | Embalagem + textura + aplicacao + ingredientes | Cremes, oleos essenciais |
| **Moveis e decoracao** | 4-8 | Ambiente + produto isolado + detalhe material + dimensoes | Cadeiras, artesanato, utilidades |
| **Joias e acessorios** | 3-6 | Produto isolado + detalhe + uso (modelo) + close acabamento | Colares, cintos, carteiras |
| **Automotivo** | 2-4 | Produto isolado + numero da peca visivel + compatibilidade | Pecas freio, bicicletas |
| **Pedras e revestimentos** | 3-5 | Superficie polida + borda/perfil + textura close-up + escala | Marmore, granito |
| **Seguranca e CFTV** | 3-5 | Produto isolado + instalacao + interface/app + angulo de cobertura | Cameras, sistemas CFTV |

## 5.3 Exibicao no formulario

Ao selecionar categoria, o formulario exibe um box com:
```
Dicas de foto para [Nome da Categoria]:
- Recomendamos [N] fotos
- Inclua: [angulos recomendados]
- Fundo branco ou neutro facilita a busca do comprador
```

Nao bloqueia upload. Nao rejeita foto fora do padrao. Orientacao apenas.

---

# 6 Priorizacao de implementacao

## 6.1 O que entra no T1 (MVP)

| Item | Justificativa |
|------|---------------|
| Taxonomia 4 niveis com seed de ~48 folhas | Estrutura base do catalogo |
| Tabela `category_attribute_templates` | Custo baixo, habilita formulario dinamico |
| Coluna `attributes` JSONB em `products` | Schema-prepared, nullable |
| Coluna `variant_parent_id` nullable em `products` | Schema-prepared pra variantes futuras |
| Templates de atributos pras ~48 folhas seed | Dados iniciais carregados via migration ou seed script |
| 2-4 atributos `show_on_card` por categoria | Melhora experiencia de busca do comprador |
| Photo guidelines como recomendacao no formulario | Sem bloqueio, melhora qualidade gradual |
| Normalizacao basica de unidades (lista sugerida por categoria) | Reduz inconsistencia sem bloquear |

## 6.2 O que entra no T2 (pos-beta)

| Item | Justificativa |
|------|---------------|
| Product groups (fornecedor organiza produtos em pastas) | Util acima de 200 SKUs |
| BuyLeads estruturado (comprador posta requisito aberto) | Validar inquiry 1-para-1 primeiro |
| Ativacao de `variant_parent_id` (UI pra variantes) | Catalogos maiores precisam |
| Sistema de avaliacao do fornecedor | Confianca e central em marketplace B2B |
| Tabela `product_certifications` com busca | Necessaria pra verticais regulados (farma, EPI) |
| Expansao de categorias (meta: 100-200 folhas) | Crescimento organico com novos fornecedores |

## 6.3 O que entra no T3 (escala)

| Item | Justificativa |
|------|---------------|
| Filtros facetados por atributo (Material, Tamanho, etc.) | IndiaMART nao tem — GiroB2B pode esperar |
| Compatibilidade de veiculo (Car Make + Model) | Especifico pra automotivo, sem massa critica no MVP |
| Sub-templates (ex: e-bike dentro de Bicicletas) | Complexidade de UX |
| Importacao em massa de atributos via CSV | Volume de dados exige |

---

# Apendice A — Decisoes trancadas (referencia rapida)

| ID | Decisao | Resultado | Data |
|----|---------|-----------|------|
| D8 | Variants | T1 schema-prepared (coluna nullable) | 02/05/2026 |
| D9 | Product groups | T2 | 02/05/2026 |
| D10 | BuyLeads estruturado | T2 | 02/05/2026 |
| D11 | Photo guidelines | T1 como recomendacao, nao bloqueio | 02/05/2026 |
| D12 | Filtros facetados | T3 confirmado | 02/05/2026 |

---

> **Manutencao:** atualizar este documento quando novas categorias forem adicionadas ou quando decisoes de schema mudarem. Templates de novas categorias seguem o mesmo formato da Secao 3. Seed script em `sistema/migrations/` implementa os INSERTs correspondentes.
