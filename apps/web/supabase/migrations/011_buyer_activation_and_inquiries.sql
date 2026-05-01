-- ============================================================
-- Migration 011: Lazy buyer activation + directed inquiries
--
-- Aligns the current schema with the new documentation baseline
-- for:
--   - buyer activation on first inquiry
--   - directed inquiries as the MVP contact flow
-- ============================================================

ALTER TABLE IF EXISTS buyers
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE buyers
SET company_name = COALESCE(company_name, company)
WHERE company_name IS NULL
  AND company IS NOT NULL;

DROP TRIGGER IF EXISTS buyers_updated_at ON buyers;
CREATE TRIGGER buyers_updated_at
  BEFORE UPDATE ON buyers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE IF EXISTS inquiries
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inquiry_type TEXT NOT NULL DEFAULT 'directed',
  ADD COLUMN IF NOT EXISTS quantity_estimate TEXT,
  ADD COLUMN IF NOT EXISTS desired_deadline TEXT,
  ADD COLUMN IF NOT EXISTS max_proposals INT,
  ADD COLUMN IF NOT EXISTS buyer_state TEXT,
  ADD COLUMN IF NOT EXISTS buyer_consent_to_share BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS report_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unlocked_by_credit BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dedup_key VARCHAR(64),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE inquiries
SET quantity_estimate = COALESCE(quantity_estimate, quantity)
WHERE quantity_estimate IS NULL
  AND quantity IS NOT NULL;

UPDATE inquiries
SET desired_deadline = COALESCE(desired_deadline, deadline)
WHERE desired_deadline IS NULL
  AND deadline IS NOT NULL;

UPDATE inquiries
SET responded_at = COALESCE(responded_at, replied_at)
WHERE responded_at IS NULL
  AND replied_at IS NOT NULL;

UPDATE inquiries
SET buyer_consent_to_share = TRUE
WHERE buyer_consent_to_share IS DISTINCT FROM TRUE;

UPDATE inquiries
SET inquiry_type = 'directed'
WHERE inquiry_type IS NULL
   OR inquiry_type = '';

UPDATE inquiries
SET status = CASE status
  WHEN 'replied' THEN 'responded'
  WHEN 'spam' THEN 'reported'
  ELSE status
END
WHERE status IN ('replied', 'spam');

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.inquiries'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status IN%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.inquiries DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END;
$$;

ALTER TABLE IF EXISTS inquiries
  DROP CONSTRAINT IF EXISTS chk_inquiries_type,
  DROP CONSTRAINT IF EXISTS chk_inquiries_desc_length,
  DROP CONSTRAINT IF EXISTS chk_inquiries_max_proposals,
  DROP CONSTRAINT IF EXISTS chk_inquiries_consent;

ALTER TABLE IF EXISTS inquiries
  ADD CONSTRAINT inquiries_status_check
    CHECK (status IN ('new', 'viewed', 'responded', 'archived', 'reported')),
  ADD CONSTRAINT chk_inquiries_type
    CHECK (inquiry_type IN ('directed', 'generic')),
  ADD CONSTRAINT chk_inquiries_desc_length
    CHECK (char_length(description) BETWEEN 20 AND 5000),
  ADD CONSTRAINT chk_inquiries_max_proposals
    CHECK (max_proposals IS NULL OR max_proposals IN (3, 5, 10)),
  ADD CONSTRAINT chk_inquiries_consent
    CHECK (buyer_consent_to_share = TRUE);

DROP TRIGGER IF EXISTS inquiries_updated_at ON inquiries;
CREATE TRIGGER inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_buyers_blocked_until ON buyers(blocked_until);
CREATE INDEX IF NOT EXISTS idx_inquiries_buyer ON inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_product ON inquiries(product_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_category ON inquiries(category_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_dedup ON inquiries(dedup_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_type_status ON inquiries(inquiry_type, status);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Buyers view own inquiries" ON inquiries;
CREATE POLICY "Buyers view own inquiries" ON inquiries FOR SELECT
  USING (buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid()));
