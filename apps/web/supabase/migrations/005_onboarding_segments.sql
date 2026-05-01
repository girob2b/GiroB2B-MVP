-- ============================================================
-- Migration 005: Onboarding segments & purchase frequency
--
-- Adds segmentation data collected during the onboarding wizard:
--   - buyers.segments         → category slugs the buyer is interested in
--   - buyers.purchase_frequency → how often this buyer purchases
-- ============================================================

ALTER TABLE buyers
  ADD COLUMN IF NOT EXISTS segments          TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS purchase_frequency TEXT
    CHECK (purchase_frequency IN ('daily', 'weekly', 'monthly', 'occasionally'));
