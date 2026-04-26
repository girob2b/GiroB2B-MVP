import { request } from "undici";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import type { Address, CompanyContact, CompanyProduct } from "../types/index.js";

export interface ExtractedData {
  legal_name: string | null;
  trade_name: string | null;
  cnpj: string | null;
  description: string | null;
  address: Address | null;
  contact: CompanyContact;
  products: CompanyProduct[];
  segment_hint: string | null;
}

// Gemini free tier: 5 RPM. Mantemos 4 para folga e evitar 429 em rajada.
const GEMINI_MAX_RPM = 4;
const GEMINI_WINDOW_MS = 60_000;
const geminiCallTimestamps: number[] = [];

async function acquireGeminiSlot(): Promise<void> {
  while (true) {
    const now = Date.now();
    while (geminiCallTimestamps.length && now - geminiCallTimestamps[0] >= GEMINI_WINDOW_MS) {
      geminiCallTimestamps.shift();
    }
    if (geminiCallTimestamps.length < GEMINI_MAX_RPM) {
      geminiCallTimestamps.push(now);
      return;
    }
    const waitMs = GEMINI_WINDOW_MS - (now - geminiCallTimestamps[0]) + 50;
    logger.debug({ waitMs, pending: geminiCallTimestamps.length }, "Gemini RPM cheio, aguardando");
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

const PROMPT_INSTRUCTIONS = `Você é um extrator de informações de empresas brasileiras a partir do HTML de páginas web.

Extraia APENAS dados que estejam explicitamente presentes no texto. Se um campo não aparece, retorne null ou array vazio.

REGRAS:
- cnpj: apenas 14 dígitos, sem formatação. Só retorne se houver CNPJ visível.
- legal_name: razão social oficial (geralmente contém "LTDA", "S.A.", "ME", "EIRELI"). Diferente do nome fantasia.
- trade_name: nome comercial / fantasia.
- address: objeto com street, number, district, city, state (sigla UF), cep (só dígitos). Omita campos faltantes.
- contact.email: email oficial da empresa (evite emails de provedores/templates).
- contact.phone: telefone fixo ou celular BR, formato livre.
- contact.whatsapp: número de WhatsApp (com DDD).
- products: lista de produtos/serviços oferecidos, até 10 itens. Cada produto tem name (obrigatório), description (opcional).
- segment_hint: área de atuação em uma frase curta ("embalagens plásticas", "autopeças", etc).
- description: resumo institucional em 1-2 frases.

Retorne APENAS o JSON, sem markdown, sem comentários.`;

/**
 * Extrai dados estruturados via Gemini Flash.
 * Ver docs/WEB_SCRAPING.md §4 camada 2.
 */
export async function extractWithLLM(
  ctx: { title: string; description: string; plaintext: string; jsonLd: Record<string, unknown>[] }
): Promise<ExtractedData | null> {
  if (!config.GEMINI_API_KEY) {
    logger.debug("GEMINI_API_KEY não configurada — pulando LLM");
    return null;
  }

  const userPrompt = `TÍTULO: ${ctx.title}
META: ${ctx.description}
JSON-LD: ${JSON.stringify(ctx.jsonLd).slice(0, 2000)}
TEXTO DA PÁGINA:
${ctx.plaintext.slice(0, 12000)}`;

  try {
    await acquireGeminiSlot();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.GEMINI_MODEL}:generateContent?key=${config.GEMINI_API_KEY}`;

    const res = await request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT_INSTRUCTIONS }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              legal_name:   { type: "string", nullable: true },
              trade_name:   { type: "string", nullable: true },
              cnpj:         { type: "string", nullable: true },
              description:  { type: "string", nullable: true },
              address: {
                type: "object",
                nullable: true,
                properties: {
                  street:     { type: "string", nullable: true },
                  number:     { type: "string", nullable: true },
                  district:   { type: "string", nullable: true },
                  city:       { type: "string", nullable: true },
                  state:      { type: "string", nullable: true },
                  cep:        { type: "string", nullable: true },
                },
              },
              contact: {
                type: "object",
                properties: {
                  email:    { type: "string", nullable: true },
                  phone:    { type: "string", nullable: true },
                  whatsapp: { type: "string", nullable: true },
                },
              },
              products: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name:        { type: "string" },
                    description: { type: "string", nullable: true },
                  },
                  required: ["name"],
                },
              },
              segment_hint: { type: "string", nullable: true },
            },
          },
        },
      }),
      headersTimeout: 25_000,
      bodyTimeout: 25_000,
    });

    if (res.statusCode !== 200) {
      const body = await res.body.text();
      logger.warn({ statusCode: res.statusCode, body: body.slice(0, 500) }, "Gemini retornou erro");
      return null;
    }

    const json = (await res.body.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as ExtractedData;

    // Normalizações defensivas
    if (parsed.cnpj) parsed.cnpj = parsed.cnpj.replace(/[^\d]/g, "");
    if (parsed.cnpj && parsed.cnpj.length !== 14) parsed.cnpj = null;
    if (!Array.isArray(parsed.products)) parsed.products = [];
    if (!parsed.contact) parsed.contact = {};

    return parsed;
  } catch (err) {
    logger.warn({ err }, "Gemini extract falhou");
    return null;
  }
}
