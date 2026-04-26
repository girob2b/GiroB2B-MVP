import { request } from "undici";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

export interface SearxResult {
  url: string;
  title: string;
  content: string;
  engine: string;
}

export interface SearxResponse {
  query: string;
  number_of_results: number;
  results: SearxResult[];
}

/**
 * Consulta SearXNG e retorna resultados agregados (Google/Bing/DDG/Brave).
 * Ver docs/WEB_SCRAPING.md §4 camada 1.
 */
export async function searchWeb(query: string, opts: { limit?: number } = {}): Promise<SearxResult[]> {
  const limit = opts.limit ?? 20;
  const url = new URL("/search", config.SEARXNG_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("safesearch", "1");

  try {
    const { statusCode, body } = await request(url, {
      method: "GET",
      headers: { "Accept": "application/json", "User-Agent": "GiroB2B-Scraper/0.1" },
      headersTimeout: 10_000,
      bodyTimeout: 10_000,
    });

    if (statusCode !== 200) {
      logger.warn({ statusCode, query }, "SearXNG retornou status não-200");
      return [];
    }

    const json = (await body.json()) as SearxResponse;
    return json.results.slice(0, limit);
  } catch (err) {
    logger.error({ err, query }, "SearXNG falhou");
    return [];
  }
}
