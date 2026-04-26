import { request } from "undici";
import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

export interface ScrapedPage {
  url: string;
  finalUrl: string;
  statusCode: number;
  html: string;
  plaintext: string;
  title: string;
  metaDescription: string;
  ogImage: string | null;
  jsonLd: Record<string, unknown>[];
  contentHash: string;
}

const UA = "GiroB2B-Scraper/0.1 (+https://girob2b.com.br/crawler)";

const MAX_HTML_BYTES = 1_500_000; // 1.5MB hard limit — páginas maiores são provavelmente SPAs/lixo

/**
 * Faz GET da URL e extrai conteúdo útil via cheerio.
 * Ver docs/WEB_SCRAPING.md §4 camada 2.
 */
export async function scrapePage(url: string): Promise<ScrapedPage | null> {
  try {
    const res = await request(url, {
      method: "GET",
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
      },
      headersTimeout: config.SCRAPE_TIMEOUT_MS,
      bodyTimeout: config.SCRAPE_TIMEOUT_MS,
      maxRedirections: 3,
    });

    if (res.statusCode >= 400) {
      logger.warn({ url, statusCode: res.statusCode }, "Scrape retornou erro");
      return null;
    }

    const contentType = (res.headers["content-type"] as string | undefined) ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      logger.debug({ url, contentType }, "Ignorando resposta não-HTML");
      return null;
    }

    // Baixa corpo com limite
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of res.body) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > MAX_HTML_BYTES) break;
      chunks.push(buf);
    }
    const html = Buffer.concat(chunks).toString("utf-8");

    const $ = cheerio.load(html);

    // Remove scripts/styles antes de extrair plaintext
    $("script, style, noscript, iframe, svg").remove();
    const plaintext = $("body").text().replace(/\s+/g, " ").trim().slice(0, 20_000);

    const title = ($("title").first().text() || $("meta[property='og:title']").attr("content") || "").trim();
    const metaDescription = ($("meta[name='description']").attr("content")
      || $("meta[property='og:description']").attr("content") || "").trim();
    const ogImage = $("meta[property='og:image']").attr("content")?.trim() ?? null;

    const jsonLd: Record<string, unknown>[] = [];
    $("script[type='application/ld+json']").each((_, el) => {
      const raw = $(el).contents().text();
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) jsonLd.push(...parsed);
        else jsonLd.push(parsed);
      } catch { /* ignora JSON-LD inválido */ }
    });

    const contentHash = createHash("sha256").update(plaintext).digest("hex");

    return {
      url,
      finalUrl: url, // undici não expõe URL final facilmente — OK para V1
      statusCode: res.statusCode,
      html,
      plaintext,
      title,
      metaDescription,
      ogImage,
      jsonLd,
      contentHash,
    };
  } catch (err) {
    logger.warn({ err, url }, "Scrape falhou");
    return null;
  }
}

/**
 * Extração por heurística (regex) — fallback quando LLM não está disponível.
 * Cobre CNPJ, emails, telefones/whatsapp, catálogo e marketplaces.
 */
export function heuristicExtract(plaintext: string, html: string, pageUrl?: string) {
  const cnpjMatch = plaintext.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
  const cnpj = cnpjMatch ? cnpjMatch[0].replace(/[^\d]/g, "") : null;

  const emails = Array.from(
    new Set(
      Array.from(
        plaintext.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g),
        (m) => m[0].toLowerCase()
      ).filter(
        (e) =>
          !e.includes("sentry.io") &&
          !e.includes("example.com") &&
          !e.endsWith(".png") &&
          !e.endsWith(".jpg") &&
          !e.endsWith(".svg")
      )
    )
  ).slice(0, 5);

  const phones = Array.from(
    new Set(
      Array.from(
        plaintext.matchAll(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}/g),
        (m) => m[0].trim()
      )
    )
  ).slice(0, 5);

  const $ = cheerio.load(html);
  const whatsappHref = $("a[href*='wa.me'], a[href*='api.whatsapp']").first().attr("href") ?? null;

  // ── Links de catálogo e marketplaces ────────────────────────────────────
  const baseUrl = pageUrl ?? "";
  const absUrl = (href: string): string | null => {
    if (!href) return null;
    try {
      return new URL(href, baseUrl || undefined).toString();
    } catch {
      return null;
    }
  };

  const marketplaceDomains = [
    "mercadolivre.com", "mercadolibre.com",
    "shopee.com", "amazon.com", "magazineluiza.com", "magazinevoce.com",
    "magalu.com", "americanas.com", "submarino.com", "casasbahia.com",
    "extra.com", "pontofrio.com", "kalunga.com.br", "etsy.com",
  ];

  let catalog_url: string | undefined;
  const marketplaceSet = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().toLowerCase();
    const abs = absUrl(href);
    if (!abs) return;

    const lowerHref = abs.toLowerCase();

    // Catálogo: PDF ou rota com "catalog"/"catálogo"
    if (!catalog_url) {
      const looksLikeCatalog =
        /\/(catalogo|catalog|catalogos|catalogs)(\b|[\/?])/i.test(lowerHref) ||
        /(catalog|catálog)/i.test(text) ||
        (/\.pdf(\b|\?)/i.test(lowerHref) && /(catalog|catálog)/i.test(text + " " + lowerHref));
      if (looksLikeCatalog) catalog_url = abs;
    }

    // Marketplaces
    for (const md of marketplaceDomains) {
      if (lowerHref.includes(md)) {
        marketplaceSet.add(abs);
        break;
      }
    }
  });

  return {
    cnpj,
    email: emails[0] ?? null,
    emails,
    phone: phones[0] ?? null,
    phones,
    whatsapp: whatsappHref,
    catalog_url: catalog_url ?? null,
    marketplace_urls: Array.from(marketplaceSet).slice(0, 5),
  };
}
