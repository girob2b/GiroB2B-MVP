import { request } from "undici";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

export interface BrasilApiCNPJ {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  situacao_cadastral?: number;
  descricao_situacao_cadastral?: string;
  cnae_fiscal?: number;
  cnae_fiscal_descricao?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
  qsa?: Array<{ nome_socio: string; qualificacao_socio: string }>;
  cnaes_secundarios?: Array<{ codigo: number; descricao: string }>;
}

/**
 * Consulta CNPJ oficial via BrasilAPI (gratuito, sem auth, dados da Receita).
 * Ver docs/WEB_SCRAPING.md §4 camada 3.
 */
export async function lookupCnpj(cnpjDigits: string): Promise<BrasilApiCNPJ | null> {
  const clean = cnpjDigits.replace(/[^\d]/g, "");
  if (clean.length !== 14) return null;

  try {
    const res = await request(`${config.BRASILAPI_URL}/cnpj/v1/${clean}`, {
      method: "GET",
      headers: { "Accept": "application/json", "User-Agent": "GiroB2B-Scraper/0.1" },
      headersTimeout: 8_000,
      bodyTimeout: 8_000,
    });

    if (res.statusCode === 404) return null;
    if (res.statusCode !== 200) {
      logger.warn({ statusCode: res.statusCode, cnpj: clean }, "BrasilAPI retornou erro");
      return null;
    }

    return (await res.body.json()) as BrasilApiCNPJ;
  } catch (err) {
    logger.warn({ err, cnpj: clean }, "BrasilAPI falhou");
    return null;
  }
}
