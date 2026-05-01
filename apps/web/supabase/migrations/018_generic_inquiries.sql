-- ============================================================
-- Migration 018: Generic (public) inquiries
--
-- Allows buyers to post open RFQs visible to all suppliers.
-- Adds target_price and contact_type fields.
-- ============================================================

-- supplier_id was NOT NULL — make it optional for generic inquiries
ALTER TABLE inquiries
  ALTER COLUMN supplier_id DROP NOT NULL;

-- New fields for buyer-posted public RFQs
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS target_price TEXT,
  ADD COLUMN IF NOT EXISTS contact_type TEXT
    CHECK (contact_type IS NULL OR contact_type IN ('fabricante', 'importador', 'atacado'));

-- Index for GERAL tab (generic inquiries ordered by date)
CREATE INDEX IF NOT EXISTS idx_inquiries_generic_created
  ON inquiries(created_at DESC)
  WHERE inquiry_type = 'generic' AND status NOT IN ('archived', 'reported');

-- ── RLS ─────────────────────────────────────────────────────────────────────

-- Any authenticated supplier can read public generic inquiries
DROP POLICY IF EXISTS "Suppliers view generic inquiries" ON inquiries;
CREATE POLICY "Suppliers view generic inquiries" ON inquiries FOR SELECT
  USING (
    inquiry_type = 'generic'
    AND status NOT IN ('archived', 'reported')
    AND EXISTS (SELECT 1 FROM suppliers WHERE user_id = auth.uid())
  );

-- Buyers can read their own generic inquiries (in addition to the existing directed policy)
DROP POLICY IF EXISTS "Buyers view own generic inquiries" ON inquiries;
CREATE POLICY "Buyers view own generic inquiries" ON inquiries FOR SELECT
  USING (
    inquiry_type = 'generic'
    AND buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
  );

-- Buyers can insert generic inquiries
DROP POLICY IF EXISTS "Buyers insert generic inquiries" ON inquiries;
CREATE POLICY "Buyers insert generic inquiries" ON inquiries FOR INSERT
  WITH CHECK (
    inquiry_type = 'generic'
    AND supplier_id IS NULL
    AND buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
  );
