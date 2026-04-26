import { supabase } from "../plugins/db.js";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { queryCacheKey } from "./dedup.js";
import type { DiscoveredCompany } from "../types/index.js";

/**
 * Cache leitura/escrita para scraper.search_cache.
 * TTL padrão 24h (configurável em CACHE_TTL_HOURS).
 * Ver docs/WEB_SCRAPING.md §4.
 */

export async function getCachedSearch(
  query: string,
  filters: Record<string, unknown>
): Promise<DiscoveredCompany[] | null> {
  const key = queryCacheKey(query, filters);

  const { data: cache, error: cacheErr } = await supabase
    .from("search_cache")
    .select("company_ids, expires_at")
    .eq("query_hash", key)
    .maybeSingle();

  if (cacheErr || !cache) return null;
  if (new Date(cache.expires_at).getTime() < Date.now()) return null;
  if (!cache.company_ids || cache.company_ids.length === 0) return [];

  const { data: companies, error: compErr } = await supabase
    .from("discovered_companies")
    .select("*")
    .in("id", cache.company_ids);

  if (compErr) {
    logger.warn({ err: compErr }, "Falha ao carregar empresas do cache");
    return null;
  }

  return (companies ?? []) as DiscoveredCompany[];
}

export async function saveSearchCache(
  query: string,
  filters: Record<string, unknown>,
  companyIds: string[]
): Promise<void> {
  const key = queryCacheKey(query, filters);
  const expiresAt = new Date(Date.now() + config.CACHE_TTL_HOURS * 3600 * 1000).toISOString();

  const { error } = await supabase
    .from("search_cache")
    .upsert({
      query_hash: key,
      query_text: query,
      filters,
      company_ids: companyIds,
      expires_at: expiresAt,
    });

  if (error) logger.warn({ err: error, key }, "Falha ao salvar cache");
}

export async function isDomainBlocked(domain: string): Promise<boolean> {
  const { data } = await supabase
    .from("domain_blocklist")
    .select("domain")
    .eq("domain", domain)
    .maybeSingle();
  return !!data;
}
