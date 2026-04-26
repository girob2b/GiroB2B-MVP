import { Worker, type Job } from "bullmq";
import { SEARCH_QUEUE_NAME } from "../plugins/queue.js";
import { redis } from "../plugins/redis.js";
import { logger } from "../lib/logger.js";
import { supabase } from "../plugins/db.js";
import { searchWeb } from "../services/searxng.js";
import { scrapePage, heuristicExtract } from "../services/scrape.js";
import { extractWithLLM } from "../services/extract.js";
import { lookupCnpj } from "../services/brasilapi.js";
import { cnaeToSegmentSlug } from "../lib/cnae-map.js";
import { normalizeDomain, isAllowedTld } from "../services/dedup.js";
import { publishJobEvent } from "../services/pubsub.js";
import { saveSearchCache, isDomainBlocked } from "../services/cache.js";
import type {
  SearchJobInput,
  DiscoveredCompany,
  SourceQuality,
  Address,
  CompanyContact,
  CompanyProduct,
} from "../types/index.js";

type JobData = SearchJobInput & { cacheKey: string };

const MAX_URLS_PER_JOB = 12;

/**
 * Pipeline de 3 camadas:
 *   L1 — SearXNG → URLs candidatas
 *   L2 — scrape + extração (LLM ou heurística)
 *   L3 — BrasilAPI → validação CNPJ e enriquecimento
 *
 * Eventos SSE emitidos via pub/sub Redis no canal scraper:job:<id>.
 * Ver docs/WEB_SCRAPING.md §4.
 */
export const searchWorker = new Worker<JobData>(
  SEARCH_QUEUE_NAME,
  async (job) => {
    const startedAt = Date.now();
    const { query, filters = {}, user_id } = job.data;
    const jobId = String(job.id);

    logger.info({ jobId, query, user_id }, "Pipeline iniciado");

    await supabase.from("search_jobs").upsert({
      id: jobId,
      user_id: user_id ?? null,
      query,
      filters,
      status: "running",
      progress: 5,
      started_at: new Date().toISOString(),
    });

    // ─── Layer 1: SearXNG ─────────────────────────────────────────────
    const queryWithFilter = [query, filters.state ? `estado ${filters.state}` : ""].filter(Boolean).join(" ");
    const searxResults = await searchWeb(queryWithFilter, { limit: MAX_URLS_PER_JOB });

    // Dedupe por domínio + filtros de TLD e blocklist
    const byDomain = new Map<string, { url: string; title: string; snippet: string }>();
    for (const r of searxResults) {
      const domain = normalizeDomain(r.url);
      if (byDomain.has(domain)) continue;
      if (!isAllowedTld(domain)) continue;
      if (await isDomainBlocked(domain)) continue;
      byDomain.set(domain, { url: r.url, title: r.title, snippet: r.content });
    }

    const candidates = Array.from(byDomain.entries()).slice(0, MAX_URLS_PER_JOB);
    logger.info({ jobId, candidateCount: candidates.length }, "L1 concluída");

    if (candidates.length === 0) {
      await publishJobEvent(jobId, {
        type: "done",
        data: { totalCompanies: 0, durationMs: Date.now() - startedAt },
      });
      await supabase.from("search_jobs").update({
        status: "completed",
        progress: 100,
        total_companies: 0,
        duration_ms: Date.now() - startedAt,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);
      return { companies: [] };
    }

    await publishJobEvent(jobId, {
      type: "discovered",
      data: {
        companies: candidates.map(([domain, r]) => ({
          domain,
          title: r.title,
          snippet: r.snippet,
          url: r.url,
        })),
      },
    });

    await job.updateProgress(20);

    // ─── Layer 2 + 3: processa cada candidata em paralelo ───────────────
    const results = await Promise.all(
      candidates.map(async ([domain, meta], idx) => {
        try {
          return await processOne({ domain, meta, query, jobId });
        } catch (err) {
          logger.warn({ err, domain, jobId }, "Erro processando candidata");
          return null;
        } finally {
          const progress = 20 + Math.round(((idx + 1) / candidates.length) * 70);
          await job.updateProgress(progress);
          await publishJobEvent(jobId, { type: "progress", data: { progress } });
        }
      })
    );

    const companies = results.filter((c): c is DiscoveredCompany => c !== null);
    const companyIds = companies.map((c) => c.id);

    await saveSearchCache(query, filters, companyIds);

    const durationMs = Date.now() - startedAt;

    await publishJobEvent(jobId, {
      type: "done",
      data: { totalCompanies: companies.length, durationMs },
    });

    await supabase.from("search_jobs").update({
      status: "completed",
      progress: 100,
      total_companies: companies.length,
      duration_ms: durationMs,
      completed_at: new Date().toISOString(),
    }).eq("id", jobId);

    logger.info({ jobId, total: companies.length, durationMs }, "Pipeline concluído");
    return { companies };
  },
  { connection: redis, concurrency: 2 }
);

searchWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Job falhou");
  if (job?.id) {
    void publishJobEvent(String(job.id), {
      type: "error",
      data: { message: err.message },
    });
    void supabase.from("search_jobs").update({
      status: "failed",
      error_message: err.message,
      completed_at: new Date().toISOString(),
    }).eq("id", String(job.id));
  }
});

searchWorker.on("ready", () => logger.info("Worker search-web pronto"));

// ═══════════════════════════════════════════════════════════════════════════
//  Pipeline por candidata
// ═══════════════════════════════════════════════════════════════════════════

interface ProcessArgs {
  domain: string;
  meta: { url: string; title: string; snippet: string };
  query: string;
  jobId: string;
}

async function processOne({ domain, meta, query, jobId }: ProcessArgs): Promise<DiscoveredCompany | null> {
  // 1) Checa se já temos essa empresa scrapeada recentemente
  const { data: existing } = await supabase
    .from("discovered_companies")
    .select("*")
    .eq("domain", domain)
    .maybeSingle();

  // Se existe e foi scrapeado há <CONTENT_REFRESH_DAYS, reusa
  const REFRESH_MS = Number(process.env.CONTENT_REFRESH_DAYS ?? 30) * 86400 * 1000;
  if (existing && existing.last_scraped_at &&
      Date.now() - new Date(existing.last_scraped_at).getTime() < REFRESH_MS) {
    logger.debug({ domain }, "Cache hit em discovered_companies");

    await publishJobEvent(jobId, {
      type: "enriched",
      data: { companyId: existing.id, full: existing as DiscoveredCompany },
    });
    return existing as DiscoveredCompany;
  }

  // 2) Scrape (L2)
  const homepageUrl = `https://${domain}/`;
  const page = await scrapePage(homepageUrl);
  if (!page) {
    // Se nem a home responde, usa só os dados do SERP como "low"
    return await upsertLow({ domain, title: meta.title, description: meta.snippet, jobId });
  }

  // 3) Extração (LLM com fallback heurístico)
  const llm = await extractWithLLM({
    title: page.title,
    description: page.metaDescription,
    plaintext: page.plaintext,
    jsonLd: page.jsonLd,
  });

  const heur = heuristicExtract(page.plaintext, page.html, homepageUrl);

  const cnpj = llm?.cnpj ?? heur.cnpj ?? null;
  const contact: CompanyContact = {
    email:    llm?.contact?.email    ?? heur.email    ?? undefined,
    phone:    llm?.contact?.phone    ?? heur.phone    ?? undefined,
    whatsapp: llm?.contact?.whatsapp ?? heur.whatsapp ?? undefined,
    emails:   heur.emails.length  ? heur.emails  : undefined,
    phones:   heur.phones.length  ? heur.phones  : undefined,
    catalog_url:      heur.catalog_url ?? undefined,
    marketplace_urls: heur.marketplace_urls.length ? heur.marketplace_urls : undefined,
  };

  let address: Address | null = llm?.address ?? null;
  let legal_name = llm?.legal_name ?? null;
  let trade_name = llm?.trade_name ?? page.title.split(/[|—–-]/)[0].trim() ?? null;
  let segment_cnae: string | null = null;
  let segment_slug: string | null = null;

  // Publica parcial ANTES de chamar BrasilAPI (pode demorar)
  const partialPayload = {
    domain,
    legal_name,
    trade_name,
    cnpj,
    description: llm?.description ?? meta.snippet,
    contact,
    website: homepageUrl,
    logo_url: page.ogImage,
  };
  // id ainda desconhecido — usaremos o domínio como "temp id" no evento partial
  await publishJobEvent(jobId, {
    type: "partial",
    data: { companyId: domain, partial: partialPayload as Partial<DiscoveredCompany> },
  });

  // 4) BrasilAPI (L3)
  let sourceQuality: SourceQuality = "medium";
  if (cnpj) {
    const official = await lookupCnpj(cnpj);
    if (official) {
      legal_name = official.razao_social ?? legal_name;
      trade_name = official.nome_fantasia || trade_name;
      address = {
        street:   official.logradouro ?? address?.street,
        number:   official.numero     ?? address?.number,
        complement: official.complemento,
        district: official.bairro     ?? address?.district,
        city:     official.municipio  ?? address?.city,
        state:    official.uf         ?? address?.state,
        cep:      official.cep        ?? address?.cep,
      };
      if (official.cnae_fiscal) {
        segment_cnae = String(official.cnae_fiscal);
        segment_slug = cnaeToSegmentSlug(official.cnae_fiscal);
      }
      sourceQuality = "high";
    }
  }

  const products: CompanyProduct[] = llm?.products ?? [];

  // 5) Upsert
  const { data: saved, error } = await supabase
    .from("discovered_companies")
    .upsert({
      domain,
      cnpj: cnpj || null,
      legal_name,
      trade_name,
      description: llm?.description ?? meta.snippet,
      address: address ?? null,
      segment_cnae,
      segment_slug,
      products,
      contact,
      website: homepageUrl,
      logo_url: page.ogImage,
      source_quality: sourceQuality,
      content_hash: page.contentHash,
      last_scraped_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    }, { onConflict: "domain" })
    .select()
    .single();

  if (error) {
    logger.warn({ err: error, domain }, "Falha ao upsert discovered_company");
    return null;
  }

  await publishJobEvent(jobId, {
    type: "enriched",
    data: { companyId: saved.id, full: saved as DiscoveredCompany },
  });

  return saved as DiscoveredCompany;
}

async function upsertLow({
  domain, title, description, jobId,
}: { domain: string; title: string; description: string; jobId: string }): Promise<DiscoveredCompany | null> {
  const { data: saved, error } = await supabase
    .from("discovered_companies")
    .upsert({
      domain,
      trade_name: title.split(/[|—–-]/)[0].trim() || null,
      description,
      website: `https://${domain}/`,
      source_quality: "low",
      last_scraped_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    }, { onConflict: "domain" })
    .select()
    .single();

  if (error || !saved) return null;

  await publishJobEvent(jobId, {
    type: "enriched",
    data: { companyId: saved.id, full: saved as DiscoveredCompany },
  });

  return saved as DiscoveredCompany;
}
