-- ============================================================
-- Migration 004: Unified registration flow
--
-- Previously buyers were auto-created via a trigger on signUp.
-- Now the role/segment is set during the onboarding wizard
-- (after first login), not at registration time.
--
-- Changes:
--   1. Drop the buyer auto-create trigger (if it was ever applied)
--   2. Make buyers.name nullable — name is collected later, during
--      profile completion, not at onboarding
-- ============================================================

DROP TRIGGER  IF EXISTS on_auth_buyer_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_buyer();

ALTER TABLE IF EXISTS buyers
  ALTER COLUMN name DROP NOT NULL;
