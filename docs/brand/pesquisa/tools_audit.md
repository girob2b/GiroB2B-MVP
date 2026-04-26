# Audit de ferramentas de geracao de imagem — GiroB2B Logo

Pesquisado em 2026-04-17. Alvo: logo 3D cinematografico volumetrico estilo Warner Bros classico (heroico, tridimensional, iluminado, premium). Problema atual: geracoes convergem em "escudo de futebol" (badge circular com texto interno e volume).

## 1. TL;DR e recomendacao

Recomendacao principal: **comecar pelo Nano Banana Pro (`gemini-3-pro-image-preview`) via Vertex AI**, usando os creditos Vertex ja disponiveis, pedindo explicitamente resolucao 4K, aspect ratio 16:9 e uma batelada de 6-10 variacoes com vocabulario de "monolito metalico cinematografico" (ver secao 4). E o unico modelo da pesquisa que combina (a) controle fino de camera/iluminacao/profundidade de campo como feature declarada do produto, (b) texto legivel de alta fidelidade — critico pra "GIROB2B" aparecer correto no logo, (c) ate 14 imagens de referencia (5 personagens + 9 objetos) caso Gustavo queira condicionar com a logo 2D atual, (d) custo marginal zero sobre os creditos Vertex. Fallback se nao convergir em 15-20 tentativas: **Flux 1.1 Pro Ultra** (US$ 0,06/img, seed deterministica, photorealismo mais cinematografico que Imagen 4) pra fotorrealismo 3D puro, ou **Ideogram 3.0 Quality** (US$ 0,09/img, style_type=DESIGN) se o bloqueio for qualidade de texto/tipografia.

- **Use Nano Banana Pro (Vertex) pra** iteracao inicial, testes A/B de camera/material/iluminacao, composicao com logo 2D atual como referencia.
- **Use Flux 1.1 Pro Ultra pra** fotorrealismo 3D cinematografico raw se o Nano Banana nao convergir — seed deterministico permite iterar so 1 parametro por vez.
- **Use Recraft v3 pra** gerar a versao vetorial (SVG) final uma vez escolhido o direcional 3D — e o unico que exporta SVG editavel nativo.
- **Evite Midjourney v7** pra este uso: nao tem API oficial ([docs.midjourney.com](https://docs.midjourney.com/hc/en-us)), workflow manual em Discord nao escala iteracao programatica, e tem clausula de receita anual (Pro/Mega obrigatorio acima de US$ 1M ARR).
- **Evite Adobe Firefly** nesta fase: Firefly Services tem minimo ~US$ 1.000/mes enterprise ([sudomock.com](https://sudomock.com/blog/adobe-firefly-api-pricing-2026)) e o modelo e treinado para "safe commercial" (estetica conservadora, nao cinematografica).
- **Evite Imagen 3** (nao Imagen 4) — esta legado, Imagen 4 ja tem Ultra (`imagen-4.0-ultra-generate-001`) disponivel.

## 2. Google Vertex AI (Imagen / Gemini / Nano Banana Pro)

Tres familias de modelos relevantes, todas acessiveis com `VERTEX_API_KEY` ja configurado:

### 2.1 Imagen 4 (`imagen-4.0-generate-001` / `-fast-` / `-ultra-`)

Modelo de difusao puro, especializado em geracao a partir de texto. Variantes ([docs.cloud.google.com — Imagen 4](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate)):

- `imagen-4.0-generate-001` — standard, 75 req/min.
- `imagen-4.0-fast-generate-001` — resolucoes limitadas (1024x1024, 896x1280, 1280x896, 768x1408, 1408x768), 150 req/min.
- `imagen-4.0-ultra-generate-001` — 2048x2048+, 30 req/min, maior fidelidade.

Parametros da API `generate-image` ([docs.cloud.google.com — Imagen API](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api) + [prompt guide](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide) + [deterministic images](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/generate-deterministic-images)):

| Parametro | Tipo | Default | Proposito |
|-----------|------|---------|-----------|
| `prompt` | string | obrigatorio | descricao textual |
| `sampleCount` | int | 1 | quantas imagens gerar (1-4 tipico) |
| `negativePrompt` | string | "" | o que excluir (ex: "text, watermark, crest, shield, badge, circle frame") |
| `seed` | int (1-2147483647) | aleatorio | determinismo: mesmo seed + mesmo prompt = mesma imagem. **Requer `addWatermark: false`** |
| `guidanceScale` | float | ~15 (Imagen) | quao literal o modelo segue o prompt; valores altos = mais fiel, menos criativo |
| `aspectRatio` | enum | "1:1" | "1:1", "9:16", "16:9", "3:4", "4:3" |
| `sampleImageSize` | enum | "1K" | "1K", "2K" (ultra-only) |
| `addWatermark` | bool | true | SynthID invisivel. **Desligue pra usar seed** |
| `safetyFilterLevel` | enum | "block_medium_and_above" | block_low / block_medium / block_only_high |
| `personGeneration` | enum | "allow_all" | allow_adult / dont_allow |
| `enhancePrompt` | bool | true | Google reescreve o prompt antes de gerar (pode sabotar direcao cinematografica — testar false) |
| `language` | enum | "auto" | codigo ISO de lingua do prompt |
| `outputOptions.mimeType` | enum | "image/png" | png / jpeg |
| `storageUri` | string | -- | salvar direto em GCS |

**Customization/reference image** ([docs.cloud.google.com — imagen-api-customization](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api-customization), [controlled customization](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/edit-controlled)): Imagen suporta `referenceImage` com `referenceType` (SUBJECT, STYLE, CONTROL — scribble, canny, face mesh) em endpoints dedicados de edit/customize. Util se Gustavo quiser condicionar com a logo 2D atual (SUBJECT) ou com uma referencia cinematografica (STYLE).

Snippet Python (google-genai SDK, endpoint Vertex):

```python
from google import genai
from google.genai import types

client = genai.Client(vertexai=True, project="girob2b", location="us-central1")

response = client.models.generate_images(
    model="imagen-4.0-ultra-generate-001",
    prompt=(
        "A polished 3D metallic monolith forming the letters 'GIRO B2B', "
        "brushed gold and chrome, low-angle hero shot, dramatic rim lighting, "
        "volumetric god-rays, deep black backdrop, cinematic 35mm, "
        "studio logo aesthetic in the style of classic Warner Bros intro"
    ),
    config=types.GenerateImagesConfig(
        number_of_images=4,
        aspect_ratio="16:9",
        negative_prompt="crest, shield, badge, soccer emblem, circular frame, flat icon, cartoon, text artifacts",
        seed=42,
        add_watermark=False,
        enhance_prompt=False,
        safety_filter_level="block_only_high",
    ),
)
```

### 2.2 Gemini 2.5 Flash Image / Nano Banana (`gemini-2.5-flash-image`)

Modelo multimodal que gera imagem como output de texto. Forcas: edicao conversacional, consistencia de personagem/objeto entre chamadas, composicao multi-referencia, baixa latencia. Preco: US$ 0,039/img (US$ 30 / 1M tokens output, 1290 tokens/img) ([cloud.google.com blog](https://cloud.google.com/blog/products/ai-machine-learning/gemini-2-5-flash-image-on-vertex-ai), [ai.google.dev](https://ai.google.dev/gemini-api/docs/image-generation)).

Parametros via `GenerateContentConfig` + `ImageConfig`:

- `response_modalities`: `['TEXT', 'IMAGE']` (obrigatorio pra ativar saida de imagem)
- `image_config.aspect_ratio`: `"1:1"`, `"3:2"`, `"2:3"`, `"3:4"`, `"4:3"`, `"4:5"`, `"5:4"`, `"9:16"`, `"16:9"`, `"21:9"`
- `image_config.image_size`: `"512"`, `"1K"`, `"2K"`, `"4K"` (use `K` maiusculo)
- `temperature`: 0-2 (default 1.0)
- `top_p`: 0-1 (default 0.95)
- `top_k`: 64 (fixo)
- `candidate_count`: default 1, max 10 imagens por prompt
- **Imagens de referencia**: passadas no `contents` como `types.Part.from_bytes(...)`. Sem parametro `reference_image` dedicado — sao parte natural da conversa multimodal.

**Nao expostos (atipico pra quem vem de Imagen/SD)**: sem `seed`, sem `negative_prompt`, sem `guidance_scale`, sem controles de safety separados. Trade-off: menos controle determinista, mais intuicao conversacional. SynthID watermark invisivel em todas as saidas, nao desligavel.

### 2.3 Nano Banana Pro (`gemini-3-pro-image-preview`) — RECOMENDADO

Baseado em Gemini 3 Pro, e a geracao atual state-of-the-art pra logo/branding ([deepmind.google](https://deepmind.google/models/gemini-image/pro/), [blog.google — Nano Banana Pro](https://blog.google/innovation-and-ai/products/nano-banana-pro/), [blog.google — developers](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-3-pro-image-developers/)).

Forcas declaradas pela DeepMind que batem direto com GiroB2B:

- **Controle fisico/cinematografico**: lighting, camera angle, focus, color grading, depth of field — parametros controlaveis via linguagem natural ([deepmind.google/models/gemini-image/pro](https://deepmind.google/models/gemini-image/pro/)).
- **Texto legivel**: menor taxa de erro em renderizacao de texto entre todos os benchmarks multilingues (<10% single-line error rate). Relevante pra "GIROB2B" nao sair como "GIROB2P" ou com artefatos.
- **Multi-referencia**: ate 14 imagens de input (ate 6 objetos + ate 5 personagens consistentes).
- **Resolucao**: 1K, 2K, 4K.
- **Aspect ratios**: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`.
- **Disponibilidade**: Gemini app, AI Studio, Gemini API e Vertex AI Studio ([blog.google](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-3-pro-image-developers/)).

Snippet Python (Vertex):

```python
from google import genai
from google.genai import types

client = genai.Client(vertexai=True, project="girob2b", location="global")

with open("girob2b.png", "rb") as f:
    ref_bytes = f.read()

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[
        types.Part.from_bytes(data=ref_bytes, mime_type="image/png"),
        (
            "Using the wordmark above as typographic reference only, "
            "reimagine 'GIRO B2B' as a cinematic 3D logo: monolithic "
            "brushed-metal letters floating in front of a deep black void, "
            "low-angle hero camera, dramatic rim lighting, volumetric "
            "god-rays passing through the letters, subtle chrome reflections, "
            "classic Warner Bros studio-logo aesthetic. No shield, no badge, "
            "no circular frame, no emblem. Standalone monolith."
        ),
    ],
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",
            image_size="4K",
        ),
        candidate_count=4,
    ),
)
```

## 3. Competitors

### 3.1 Flux 1.1 Pro / Flux 1.1 Pro Ultra (Black Forest Labs)

State-of-the-art em fotorrealismo open/commercial. Pro-Ultra entrega 4MP (ate 2K) em ~10s ([bfl.ai/pricing](https://bfl.ai/pricing), [bfl.ai/models/flux-pro-ultra](https://bfl.ai/models/flux-pro-ultra), [fal.ai flux-pro v1.1-ultra](https://fal.ai/docs/model-api-reference/image-generation-api/flux-pro-v1.1-ultra)).

- **Preco**: Pro US$ 0,04/img, Ultra US$ 0,06/img.
- **Parametros**: `prompt`, `width`, `height`, `prompt_upsampling` (bool, equivalente a enhance_prompt), `seed` (uint32, deterministico no mesmo modelo/versao), `safety_tolerance` (0-6), `output_format` (jpeg/png).
- **Ultra acrescenta**: `aspect_ratio` (21:9, 16:9, 4:3, 3:2, 1:1, 2:3, 3:4, 9:16, 9:21), `image_prompt` (URL de referencia), `image_prompt_strength` (0-1).
- **Seed deterministico**: mesma seed + mesmo prompt = mesma imagem. Ideal pra iteracao controlada.
- **Kontext Pro/Max**: variantes de edicao com instrucoes em linguagem natural ([bfl.ai/models/flux-kontext](https://bfl.ai/models/flux-kontext), [replicate.com — flux-kontext-pro](https://replicate.com/black-forest-labs/flux-kontext-pro)) — util pra refinar iterativamente ("make the letters more brushed-metal, less polished").
- **API publica**: sim, BFL direto ou via Replicate/fal.ai/Runware.
- **Commercial license**: liberada no tier API.

### 3.2 Ideogram 3.0

Especialista em texto-em-imagem e design grafico ([docs.ideogram.ai — API plans](https://docs.ideogram.ai/plans-and-pricing/ideogram-api), [developer.ideogram.ai](https://developer.ideogram.ai/api-reference/api-reference/generate-v3)).

- **Preco**: Turbo US$ 0,03/img, Default intermediario, Quality US$ 0,09/img.
- **Parametros ricos**: `prompt`, `rendering_speed` (TURBO/DEFAULT/QUALITY/FLASH), `seed`, `num_images`, `magic_prompt` (AUTO/ON/OFF), `style_type` (AUTO/GENERAL/REALISTIC/**DESIGN**/FICTION), `style_preset` (57 presets), `style_codes` (hex 8-char), `style_reference_images` (ate 10MB), `character_reference_images` (1 imagem, 10MB), `character_reference_images_mask`, `negative_prompt`, `color_palette` (presets ou hex com pesos), `aspect_ratio` ou `resolution`.
- **Forca**: o `style_type=DESIGN` foi treinado pra saidas tipo logo/branding. Texto sai limpo.
- **Fraqueza**: estetica tende a flat/vetorial, 3D cinematografico pesado pode ficar menos dramatico que Flux/Nano Banana Pro.
- **Commercial license**: planos API pagos tem direitos comerciais plenos.

### 3.3 Midjourney v7

Qualidade estetica lider de mercado, mas nao encaixa no workflow GiroB2B.

- **API oficial**: NAO existe em 2026 ([docs.midjourney.com](https://docs.midjourney.com/hc/en-us)). Acesso programatico so via wrappers nao-oficiais (CometAPI, APIFRAME, LinkrAPI) que automatizam o Discord — fragil e fora de TOS.
- **Preco direto**: US$ 10 / 30 / 60 / 120 por mes (Basic/Standard/Pro/Mega).
- **Wrappers**: US$ 0,019-0,025/img (APIFRAME).
- **Commercial terms**: obrigatorio Pro (US$ 60/mes) ou Mega (US$ 120/mes) se empresa tem receita anual > US$ 1M USD.
- **Veredicto**: otimo pra explorar direcionais manualmente, ruim pra iteracao programatica.

### 3.4 Imagen 3 / Imagen 4

Imagen 3 (`imagen-3.0-generate-002`) — legado, substituido por Imagen 4. Nao ha razao pra usar Imagen 3 se Imagen 4 ja esta GA. Imagen 4 ja coberto em 2.1.

### 3.5 Adobe Firefly 3 / Firefly Services API

Foco em "commercially safe" — treinado so em Adobe Stock + dominio publico + conteudo licenciado, com IP indemnification pra enterprise ([helpx.adobe.com](https://helpx.adobe.com/firefly/web/generate-images-with-text-to-image/customize-generated-images/reference-images-for-styling.html), [developer.adobe.com Firefly Services](https://developer.adobe.com/firefly-services/docs/firefly-api/)).

- **Preco API**: US$ 0,02-0,10 por imagem, com minimo enterprise ~US$ 1.000/mes ([sudomock.com](https://sudomock.com/blog/adobe-firefly-api-pricing-2026)).
- **Parametros reference**: `style.imageReference` + `structure.imageReference` com `strength` (1-100, default 50) ([developer.adobe.com — structure-image-reference](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/structure-image-reference/), [style-image-reference](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/style-image-reference/)).
- **Fraqueza pra GiroB2B**: estetica tende a conservadora/stock, nao cinematografica. Minimo mensal mata hobby/pre-MVP.

### 3.6 Recraft v3

Unico que gera SVG vetorial nativo editavel — deciso pra logo final ([recraft.ai/pricing?tab=api](https://www.recraft.ai/pricing?tab=api), [recraft.ai/docs — pricing](https://www.recraft.ai/docs/api-reference/pricing), [flowith.io blog](https://flowith.io/blog/recraft-v3-faq-vector-export-formats-style-lock-commercial-license-api/)).

- **Preco API**: US$ 0,04/img raster, US$ 0,08/img vetor SVG.
- **Plano Pago**: US$ 10/mes = 1.000 creditos + commercial rights + imagens privadas + trademark-friendly.
- **Forca unica**: exporta SVG com camadas estruturadas, pronto pra web/print/trademark.
- **Fraqueza**: 3D cinematografico volumetrico nao e a especialidade — estetica mais flat/ilustrativa. Usar como finisher depois que direcao estiver fechada.

## 4. Por que "escudo de futebol" acontece

Observacao pratica: quando usuarios pedem "3D logo" a qualquer modelo generalista, uma fracao altissima retorna badge/crest/shield/emblem. Causa composta:

1. **Vies do corpus de treinamento**. Imagens etiquetadas como "3D logo" em bancos publicos sao dominadas por templates de logo maker (Looka, Canva, DesignEvo, Fotor) que majoritariamente produzem escudos esportivos, badges corporativos e emblemas redondos com texto interno. Confirmado pela densidade de resultados "3d shield logo" em repositorios comerciais ([vecteezy.com](https://www.vecteezy.com/free-vector/3d-shield-logo), [shutterstock.com 3d-shield-logo](https://www.shutterstock.com/search/3d-shield-logo), [designevo.com shield logo maker](https://www.designevo.com/create/logos/shield.html)).
2. **"Logo" como token ativa prior de encapsulamento**. Modelos leem "logo" e ativam priors de forma fechada (circulo, escudo, selo, moldura) porque o dataset inteiro associa logo = recipiente contido. "3D" so adiciona volume ao mesmo recipiente.
3. **Enhancers de prompt amplificam o vies**. O `enhancePrompt=true` default do Imagen e o `prompt_upsampling=true` do Flux reescrevem o prompt antes da geracao, muitas vezes injetando "emblem", "crest" ou "badge" porque o LLM-enhancer tambem foi treinado no mesmo vies.

**Padroes de prompt que CAUSAM escudo**:

- Palavras-gatilho: `logo`, `emblem`, `crest`, `badge`, `seal`, `monogram`, `insignia`, `shield`, `coat of arms`, `circular logo`, `round logo`.
- Estruturas: "3D logo with [name] inside", "corporate logo with initials", "logo featuring the letters X Y Z".
- Referencias esportivas/militares/classicas: "premium", "elegant", "corporate" tendem a puxar pra badge formal.

**Padroes que EVITAM escudo** (use isto pra GiroB2B):

- Vocabulario de **material**: "brushed gold monolith", "polished chrome slab", "carved marble letterforms", "volumetric metallic sculpture", "standalone 3D wordmark".
- Vocabulario de **camera**: "low-angle hero shot", "extreme perspective", "35mm anamorphic", "dolly-in cinematic", "studio intro reveal".
- Vocabulario de **iluminacao**: "dramatic rim lighting", "volumetric god-rays", "tenebrism key light", "cinematic three-point lighting", "golden hour backlight".
- Vocabulario de **referencia cultural**: "classic Warner Bros studio logo intro", "Universal Pictures globe reveal aesthetic", "HBO feature-title card 1999".
- **Tipografia explicita**: "wordmark only", "standalone letterforms", "typography as sculpture", "no container, no frame, no shield, no circle".
- **Negative prompt agressivo**: `crest, shield, badge, emblem, seal, circular frame, round frame, soccer logo, coat of arms, heraldry, round border, flat icon`.

Apoio conceitual geral sobre como o vies de dataset condiciona saidas: [research.aimultiple.com/ai-bias](https://research.aimultiple.com/ai-bias/), [mitsloanedtech.mit.edu — AI hallucinations and bias](https://mitsloanedtech.mit.edu/ai/basics/addressing-ai-hallucinations-and-bias/).

## 5. Comparativo

| Modelo | API access | USD/img | Ref img | Seed determ. | 3D cinematic | Licenca comercial | Veredicto GiroB2B |
|--------|------------|---------|---------|--------------|--------------|-------------------|-------------------|
| Nano Banana Pro (`gemini-3-pro-image-preview`) | Vertex AI | ~US$ 0,13/img est. (token-based, 4K mais caro) | Sim, ate 14 imgs | Nao exposto | **Excelente** (physics-aware) | Licenca Vertex | **Primario** |
| Gemini 2.5 Flash Image (Nano Banana) | Vertex AI | US$ 0,039 | Sim, via contents[] | Nao | Bom | Vertex | Iteracao rapida |
| Imagen 4 Ultra (`imagen-4.0-ultra-generate-001`) | Vertex AI | ~US$ 0,04 est. | SUBJECT/STYLE/CONTROL | Sim (com watermark=false) | Bom | Vertex | Backup no Vertex |
| Flux 1.1 Pro Ultra | BFL/Replicate/fal.ai | US$ 0,06 | Sim, image_prompt + strength | **Sim** | **Excelente** (photoreal) | Liberada em API | **Fallback externo** |
| Flux Kontext Max | BFL/Replicate | US$ 0,08 | Editing nativo | Sim | Bom | Liberada | Refino iterativo |
| Ideogram 3.0 Quality | Ideogram API | US$ 0,09 | Style + character ref | Sim | Medio | Planos pagos | Se precisar texto perfeito |
| Midjourney v7 | **Sem API oficial** | US$ 10-120/mes (+Discord) | Via --cref / --sref | Nao | Excelente | Pro/Mega se ARR > US$ 1M | Evitar pra este uso |
| Adobe Firefly 3 / Firefly Services | API enterprise | US$ 0,02-0,10 + min ~US$ 1k/mes | styleRef + structureRef | Parcial | Fraco (conservador) | IP indemnification enterprise | Evitar agora |
| Recraft v3 | Recraft API | US$ 0,04 raster, US$ 0,08 SVG | Sim | Sim | Fraco pra volumetrico | Comercial + trademark | **Finisher SVG** |

## 6. Recomendacao final

**Caminho primario**: Nano Banana Pro via Vertex AI.

1. Rodar 3 batches de 6 imagens (18 total) no `gemini-3-pro-image-preview` em 4K/16:9, variando apenas o **vocabulario de material** (gold monolith vs chrome slab vs marble sculpture), mantendo camera/iluminacao/negative constantes. Custo marginal: zero (creditos Vertex). Custo referencial ~US$ 2-3 equivalente se fosse cobrado.
2. Passar a logo 2D atual (`girob2b.png`) como primeira `Part` do `contents` pra ancorar tipografia/cor de marca.
3. Se saida convergir pra direcional agradavel, iterar +10 imagens variando so **camera/lighting** no mesmo direcional.
4. Levar top-3 candidatos pra Recraft v3 (US$ 0,08/img x 3 = US$ 0,24) pra gerar SVG vetorial do direcional escolhido. Recraft nao vai replicar o 3D volumetrico, mas gera o wordmark vetorial que pode depois ser renderizado em 3D via Blender/Spline a partir do SVG.

**Fallback se Nano Banana Pro nao convergir em 20 tentativas** (empaca no escudo ou perde tipografia): **Flux 1.1 Pro Ultra** via fal.ai. Custo: US$ 0,06 x 20 iteracoes = US$ 1,20. Usar seed fixo e variar um parametro por vez (aspect_ratio, image_prompt_strength com logo 2D como referencia, prompt_upsampling off pra evitar reescrita).

**Budget total estimado pra chegar em um direcional final**: US$ 0-5 (Vertex zero + eventual Flux fallback + finisher Recraft). Ordem de grandeza dentro de uma tarde de trabalho.

**Workflow sugerido**:

```
Nano Banana Pro (Vertex, ~18 imgs) 
   --> se converge: Recraft v3 SVG (3 imgs) --> Blender/Spline 3D render final
   --> se nao converge: Flux 1.1 Pro Ultra (fal.ai, ~20 imgs) 
       --> Flux Kontext Max (refino iterativo, 5-10 imgs) 
       --> Recraft v3 SVG --> 3D render final
```

**Gotchas que o CEO precisa saber antes de escolher**:

- Imagen seed so funciona com `addWatermark=false`. Se quiser determinismo, desligue watermark explicitamente — e assuma que a saida nao tera SynthID.
- Nano Banana Pro **nao aceita seed** — e um modelo multimodal, nao difusao. Iteracao e conversacional, nao deterministica. Pra rerun identico, nao tem jeito.
- Flux e BFL direto tem rate limit agressivo em tier free; pra iterar 20+ imagens, usar fal.ai ou Replicate como intermediario e mais rapido.
- Midjourney `--cref` (character reference) exige Discord manual — zero automacao.
- Recraft SVG e otimo, mas nao vai entregar o "Warner Bros" final sozinho; precisa pipeline 3D (Blender/Spline/Cinema4D) depois.
- `enhancePrompt=true` e `prompt_upsampling=true` sao os maiores sabotadores de direcao cinematografica — **desligue sempre**. Testado na pratica: prompts longos bem escritos perdem qualidade quando o enhancer os reescreve.
- Nano Banana Pro ainda esta em preview (`gemini-3-pro-image-preview`) — API pode mudar antes de GA. Verificar changelog antes de iteracao grande.

## 7. Fontes

- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/generate-deterministic-images
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/omit-content-using-a-negative-prompt
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api-customization
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/edit-controlled
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image
- https://cloud.google.com/blog/products/ai-machine-learning/gemini-2-5-flash-image-on-vertex-ai
- https://ai.google.dev/gemini-api/docs/image-generation
- https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image
- https://deepmind.google/models/gemini-image/pro/
- https://deepmind.google/models/gemini-image/
- https://blog.google/innovation-and-ai/products/nano-banana-pro/
- https://blog.google/innovation-and-ai/technology/developers-tools/gemini-3-pro-image-developers/
- https://aistudio.google.com/models/gemini-3-pro-image
- https://bfl.ai/pricing
- https://bfl.ai/models/flux-pro
- https://bfl.ai/models/flux-pro-ultra
- https://bfl.ai/models/flux-kontext
- https://docs.bfl.ai/flux_models/flux_1_1_pro
- https://fal.ai/docs/model-api-reference/image-generation-api/flux-pro-v1.1-ultra
- https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra/api
- https://replicate.com/black-forest-labs/flux-kontext-pro
- https://docs.ideogram.ai/plans-and-pricing/ideogram-api
- https://developer.ideogram.ai/api-reference/api-reference/generate-v3
- https://developer.ideogram.ai/ideogram-api/api-setup
- https://ideogram.ai/features/api-pricing
- https://docs.midjourney.com/hc/en-us
- https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans
- https://developer.adobe.com/firefly-services/docs/firefly-api/
- https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/style-image-reference/
- https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/structure-image-reference/
- https://helpx.adobe.com/firefly/web/generate-images-with-text-to-image/customize-generated-images/reference-images-for-styling.html
- https://sudomock.com/blog/adobe-firefly-api-pricing-2026
- https://www.recraft.ai/pricing
- https://www.recraft.ai/pricing?tab=api
- https://www.recraft.ai/docs/api-reference/pricing
- https://flowith.io/blog/recraft-v3-faq-vector-export-formats-style-lock-commercial-license-api/
- https://research.aimultiple.com/ai-bias/
- https://mitsloanedtech.mit.edu/ai/basics/addressing-ai-hallucinations-and-bias/
- https://www.vecteezy.com/free-vector/3d-shield-logo
- https://www.shutterstock.com/search/3d-shield-logo
- https://www.designevo.com/create/logos/shield.html
