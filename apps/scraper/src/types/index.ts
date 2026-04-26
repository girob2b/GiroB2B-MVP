// ═══════════════════════════════════════════════════════════════════════════
//  Tipos compartilhados entre routes / services / pipeline / workers.
//  Ver docs/WEB_SCRAPING.md para semântica de cada campo.
// ═══════════════════════════════════════════════════════════════════════════

export interface Address {
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  cep?: string;
}

export interface CompanyContact {
  email?: string;
  phone?: string;
  whatsapp?: string;
  emails?: string[];
  phones?: string[];
  catalog_url?: string;
  marketplace_urls?: string[];
}

export interface CompanyProduct {
  name: string;
  description?: string;
  category_hint?: string;
}

export type SourceQuality = "high" | "medium" | "low";

export interface DiscoveredCompany {
  id: string;
  domain: string;
  cnpj: string | null;
  legal_name: string | null;
  trade_name: string | null;
  description: string | null;
  address: Address | null;
  segment_cnae: string | null;
  segment_slug: string | null;
  products: CompanyProduct[];
  contact: CompanyContact;
  website: string | null;
  logo_url: string | null;
  source_quality: SourceQuality;
  claimed_by_supplier_id: string | null;
  content_hash: string | null;
  last_scraped_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchJobInput {
  query: string;
  filters?: {
    state?: string;
    segment_slug?: string;
  };
  user_id?: string;
}

export interface SearchJobResult {
  jobId: string;
  companies: DiscoveredCompany[];
  cached: boolean;
}

// ── Eventos SSE ────────────────────────────────────────────────────────────

export type SseEvent =
  | { type: "discovered"; data: { companies: Array<{ domain: string; title: string; snippet: string; url: string }> } }
  | { type: "partial"; data: { companyId: string; partial: Partial<DiscoveredCompany> } }
  | { type: "enriched"; data: { companyId: string; full: DiscoveredCompany } }
  | { type: "progress"; data: { progress: number } }
  | { type: "done"; data: { totalCompanies: number; durationMs: number } }
  | { type: "error"; data: { message: string; code?: string } };
