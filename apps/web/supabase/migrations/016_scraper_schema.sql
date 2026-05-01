-- ═══════════════════════════════════════════════════════════════════════════
--  Migration 016 — Schema `scraper.*`
--
--  Suporte ao microsserviço girob2b-scraper:
--  - Empresas descobertas via web scraping (discovered_companies)
--  - Cache de queries (search_cache)
--  - Jobs assíncronos (search_jobs)
--  - Intenções de contato (contact_requests)
--  - HTML bruto para auditoria/re-extração (raw_pages)
--  - Blocklist de domínios (domain_blocklist)
--
--  Ver docs/WEB_SCRAPING.md para arquitetura completa.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS scraper;

-- ── Extensões ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
--  scraper.discovered_companies
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scraper.discovered_companies (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  domain                  TEXT UNIQUE NOT NULL,
  cnpj                    TEXT UNIQUE,

  legal_name              TEXT,
  trade_name              TEXT,
  description             TEXT,

  address                 JSONB,
  segment_cnae            TEXT,
  segment_slug            TEXT,

  products                JSONB DEFAULT '[]'::JSONB,
  contact                 JSONB DEFAULT '{}'::JSONB,

  website                 TEXT,
  logo_url                TEXT,

  source_quality          TEXT NOT NULL DEFAULT 'low'
                          CHECK (source_quality IN ('high', 'medium', 'low')),

  claimed_by_supplier_id  UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,

  content_hash            TEXT,
  last_scraped_at         TIMESTAMPTZ,
  last_accessed_at        TIMESTAMPTZ DEFAULT NOW(),

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disc_companies_cnpj         ON scraper.discovered_companies(cnpj)         WHERE cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disc_companies_segment_slug ON scraper.discovered_companies(segment_slug) WHERE segment_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disc_companies_state        ON scraper.discovered_companies ((address->>'state'));
CREATE INDEX IF NOT EXISTS idx_disc_companies_claimed      ON scraper.discovered_companies(claimed_by_supplier_id) WHERE claimed_by_supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disc_companies_last_access  ON scraper.discovered_companies(last_accessed_at);

COMMENT ON TABLE  scraper.discovered_companies IS 'Empresas descobertas via web scraping. Chave: domain normalizado.';
COMMENT ON COLUMN scraper.discovered_companies.source_quality IS 'high: CNPJ validado + dados BrasilAPI; medium: dados da home extraídos; low: apenas SERP';

-- ═══════════════════════════════════════════════════════════════════════════
--  scraper.search_cache
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scraper.search_cache (
  query_hash    TEXT PRIMARY KEY,
  query_text    TEXT NOT NULL,
  filters       JSONB DEFAULT '{}'::JSONB,
  company_ids   UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON scraper.search_cache(expires_at);

COMMENT ON TABLE scraper.search_cache IS 'Cache de queries. TTL padrão 24h. query_hash = sha256(query + filters).';

-- ═══════════════════════════════════════════════════════════════════════════
--  scraper.search_jobs
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scraper.search_jobs (
  id               UUID PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  query            TEXT NOT NULL,
  filters          JSONB DEFAULT '{}'::JSONB,

  status           TEXT NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),

  progress         INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),

  total_companies  INT DEFAULT 0,
  duration_ms      INT,
  error_message    TEXT,

  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_jobs_user     ON scraper.search_jobs(user_id)    WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_search_jobs_status   ON scraper.search_jobs(status);
CREATE INDEX IF NOT EXISTS idx_search_jobs_created  ON scraper.search_jobs(created_at DESC);

COMMENT ON TABLE scraper.search_jobs IS 'Auditoria de jobs. ID = BullMQ job ID. Espelha estado da fila para acesso após expiração do Redis.';

-- ═══════════════════════════════════════════════════════════════════════════
--  scraper.contact_requests
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scraper.contact_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id       UUID NOT NULL REFERENCES scraper.discovered_companies(id) ON DELETE CASCADE,

  channel          TEXT NOT NULL
                   CHECK (channel IN ('email', 'whatsapp', 'phone', 'invite', 'site')),

  message          TEXT,
  contact_target   TEXT,

  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'sent', 'failed', 'replied')),

  error_message    TEXT,
  sent_at          TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_req_user     ON scraper.contact_requests(user_id)    WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contact_req_company  ON scraper.contact_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_contact_req_status   ON scraper.contact_requests(status);

COMMENT ON TABLE scraper.contact_requests IS 'Intenções de contato registradas pelo comprador. Auditoria e loop de feedback para outreach.';

-- ═══════════════════════════════════════════════════════════════════════════
--  scraper.raw_pages (auditoria opcional)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scraper.raw_pages (
  domain        TEXT PRIMARY KEY,
  url           TEXT NOT NULL,
  status_code   INT NOT NULL,
  html          TEXT,
  content_hash  TEXT NOT NULL,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_pages_fetched ON scraper.raw_pages(fetched_at DESC);

COMMENT ON TABLE scraper.raw_pages IS 'HTML bruto da home por domínio. Permite re-extração sem re-scrapear. Pode ser truncada periodicamente.';

-- ═══════════════════════════════════════════════════════════════════════════
--  scraper.domain_blocklist
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scraper.domain_blocklist (
  domain       TEXT PRIMARY KEY,
  reason       TEXT,
  added_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE scraper.domain_blocklist IS 'Domínios que não devem ser scrapeados (LGPD, concorrentes, redes sociais).';

-- Seeds iniciais — redes sociais e plataformas genéricas
INSERT INTO scraper.domain_blocklist (domain, reason) VALUES
  ('facebook.com',     'Rede social — dados pessoais'),
  ('instagram.com',    'Rede social — dados pessoais'),
  ('linkedin.com',     'Rede social — ToS restritivo'),
  ('twitter.com',      'Rede social'),
  ('x.com',            'Rede social'),
  ('youtube.com',      'Plataforma de vídeo'),
  ('mercadolivre.com.br', 'Marketplace — não é site de empresa'),
  ('olx.com.br',       'Classificados'),
  ('amazon.com.br',    'Marketplace'),
  ('americanas.com.br','Marketplace'),
  ('magazineluiza.com.br', 'Marketplace'),
  ('shopee.com.br',    'Marketplace')
ON CONFLICT (domain) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
--  Triggers
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION scraper.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS discovered_companies_updated_at ON scraper.discovered_companies;
CREATE TRIGGER discovered_companies_updated_at
  BEFORE UPDATE ON scraper.discovered_companies
  FOR EACH ROW EXECUTE FUNCTION scraper.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
--  RLS — tudo fechado. Só service role acessa (via microsserviço).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE scraper.discovered_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper.search_cache          ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper.search_jobs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper.contact_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper.raw_pages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper.domain_blocklist      ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy criada = nenhum acesso via anon/authenticated.
-- Service role bypassa RLS automaticamente.

-- ═══════════════════════════════════════════════════════════════════════════
--  Permissões no schema
-- ═══════════════════════════════════════════════════════════════════════════

GRANT USAGE ON SCHEMA scraper TO postgres, service_role;
GRANT ALL   ON ALL TABLES IN SCHEMA scraper TO postgres, service_role;
GRANT ALL   ON ALL SEQUENCES IN SCHEMA scraper TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA scraper
  GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA scraper
  GRANT ALL ON SEQUENCES TO postgres, service_role;
