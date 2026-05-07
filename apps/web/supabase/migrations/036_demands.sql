-- Migration 036: demands (reverse marketplace) + supplier subscription
-- Pivô 2026-05-07 — ver docs/today/MVP_PIVOT_2026-05-07.md

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Subscription status do supplier (paywall do reverse marketplace)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE supplier_subscription_status AS ENUM ('inactive', 'trialing', 'active', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS subscription_status supplier_subscription_status NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_suppliers_subscription_status ON suppliers (subscription_status);

COMMENT ON COLUMN suppliers.subscription_status IS
  'Status da assinatura paga do supplier. inactive=default, trialing=período de teste, active=pagando, expired=lapsou. Gate do botão "Contatar via WhatsApp" no feed de leads.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Tabela demands (necessidades publicadas pelos compradores)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE demand_status AS ENUM ('open', 'negotiating', 'fulfilled', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,

  -- Conteúdo
  title TEXT NOT NULL CHECK (length(title) BETWEEN 5 AND 120),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 20 AND 5000),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  subcategory_slug TEXT,

  -- Quantificação
  quantity NUMERIC,
  unit TEXT,
  budget_max_cents BIGINT,
  deadline DATE,

  -- Geografia
  delivery_city TEXT,
  delivery_state CHAR(2),

  -- Contato (gate principal de PII)
  whatsapp_number TEXT NOT NULL,

  -- Mídia
  photos_urls JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Estado
  status demand_status NOT NULL DEFAULT 'open',
  views_count INTEGER NOT NULL DEFAULT 0,
  contact_count INTEGER NOT NULL DEFAULT 0,

  -- Tempo
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- LGPD (consent explícito do buyer ao publicar — RF-01.08 do pivot)
  lgpd_consent BOOLEAN NOT NULL DEFAULT FALSE,
  lgpd_consent_at TIMESTAMPTZ,
  lgpd_consent_text_version TEXT,

  CONSTRAINT chk_state_uppercase CHECK (delivery_state IS NULL OR delivery_state = upper(delivery_state)),
  CONSTRAINT chk_lgpd_required CHECK (lgpd_consent = TRUE),
  CONSTRAINT chk_photos_json CHECK (jsonb_typeof(photos_urls) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_demands_status_published ON demands (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_demands_category_open ON demands (category_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_demands_state_open ON demands (delivery_state) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_demands_expires_at ON demands (expires_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_demands_buyer ON demands (buyer_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION trg_demands_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS demands_set_updated_at ON demands;
CREATE TRIGGER demands_set_updated_at
  BEFORE UPDATE ON demands
  FOR EACH ROW EXECUTE FUNCTION trg_demands_set_updated_at();

COMMENT ON TABLE demands IS
  'Necessidades publicadas por compradores. Cara da vitrine no reverse marketplace (pivô 2026-05-07).';
COMMENT ON COLUMN demands.whatsapp_number IS
  'Número de WhatsApp do comprador. Visível apenas para suppliers com subscription_status=active após click registrado em demand_contacts.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS: dono pode CRUD; público lê só status=open + não expirado.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE demands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demands_buyer_all ON demands;
CREATE POLICY demands_buyer_all ON demands
  FOR ALL TO authenticated
  USING (buyer_user_id = auth.uid())
  WITH CHECK (buyer_user_id = auth.uid());

DROP POLICY IF EXISTS demands_public_read ON demands;
CREATE POLICY demands_public_read ON demands
  FOR SELECT TO anon, authenticated
  USING (status = 'open' AND expires_at > NOW());

-- View pública sanitizada — sem whatsapp_number. Esta é a fonte para listagens
-- não autenticadas e para suppliers sem assinatura ativa (preview).
CREATE OR REPLACE VIEW demands_public AS
SELECT
  id, slug, title, description,
  category_id, subcategory_slug,
  quantity, unit, budget_max_cents, deadline,
  delivery_city, delivery_state,
  photos_urls,
  status, views_count, contact_count,
  published_at, expires_at, created_at
FROM demands
WHERE status = 'open' AND expires_at > NOW();

GRANT SELECT ON demands_public TO anon, authenticated;

COMMENT ON VIEW demands_public IS
  'Versão pública das demands sem whatsapp_number. Usada nas páginas /buscar, /categoria/[slug] e /necessidade/[slug] para visitantes e suppliers sem assinatura ativa.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Auditoria de cliques no botão "Contatar via WhatsApp"
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS demand_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_demand_contacts_demand ON demand_contacts (demand_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_demand_contacts_supplier ON demand_contacts (supplier_id, clicked_at DESC);

ALTER TABLE demand_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demand_contacts_supplier_read ON demand_contacts;
CREATE POLICY demand_contacts_supplier_read ON demand_contacts
  FOR SELECT TO authenticated
  USING (supplier_user_id = auth.uid());

DROP POLICY IF EXISTS demand_contacts_buyer_read ON demand_contacts;
CREATE POLICY demand_contacts_buyer_read ON demand_contacts
  FOR SELECT TO authenticated
  USING (demand_id IN (SELECT id FROM demands WHERE buyer_user_id = auth.uid()));

COMMENT ON TABLE demand_contacts IS
  'Log de cada vez que um supplier clica em "Contatar via WhatsApp" numa demand. Service role insere via RPC; supplier vê os próprios; buyer vê quem contatou as próprias demands.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC: registrar contato + incrementar contador (atomicamente)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION register_demand_contact(
  p_demand_id UUID,
  p_supplier_id UUID,
  p_supplier_user_id UUID,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO demand_contacts (demand_id, supplier_id, supplier_user_id, ip, user_agent)
  VALUES (p_demand_id, p_supplier_id, p_supplier_user_id, p_ip, p_user_agent)
  RETURNING id INTO v_id;

  UPDATE demands SET contact_count = contact_count + 1 WHERE id = p_demand_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION register_demand_contact(UUID, UUID, UUID, TEXT, TEXT) FROM PUBLIC;
-- Server Action chama via service_role; não exponho ao client.

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. View `supplier_can_contact` — combina subscription + dado do supplier
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW supplier_can_contact AS
SELECT
  s.id AS supplier_id,
  s.user_id AS supplier_user_id,
  s.trade_name,
  s.subscription_status,
  s.subscription_expires_at,
  CASE
    WHEN s.subscription_status = 'active' AND (s.subscription_expires_at IS NULL OR s.subscription_expires_at > NOW())
      THEN TRUE
    WHEN s.subscription_status = 'trialing' AND (s.subscription_expires_at IS NULL OR s.subscription_expires_at > NOW())
      THEN TRUE
    ELSE FALSE
  END AS can_contact
FROM suppliers s;

GRANT SELECT ON supplier_can_contact TO authenticated;

COMMIT;
