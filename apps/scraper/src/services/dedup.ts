import { createHash } from "node:crypto";

/**
 * Normaliza um domínio: remove protocol, www., trailing slash, porta, query.
 * Usada como chave primária de deduplicação em discovered_companies.
 */
export function normalizeDomain(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase().replace(/^www\./, "").replace(/\/$/, "");
  }
}

export function hashString(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function queryCacheKey(query: string, filters: Record<string, unknown> = {}): string {
  const normalized = query.trim().toLowerCase();
  const filterStr = JSON.stringify(Object.fromEntries(Object.entries(filters).sort()));
  return hashString(`${normalized}::${filterStr}`);
}

const ALLOWED_TLDS = [".com.br", ".com", ".ind.br", ".net.br", ".org.br"];

export function isAllowedTld(domain: string): boolean {
  return ALLOWED_TLDS.some((tld) => domain.endsWith(tld));
}
