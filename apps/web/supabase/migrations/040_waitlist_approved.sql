-- Migration 040: waitlist ganha rastro de aprovação manual.
--
-- O fluxo (decisão de produto 2026-05-14, A2) é:
--   1. Admin abre /admin/waitlist
--   2. Clica "Aprovar" no inscrito
--   3. approved_at = now()
--   4. Admin copia o email e envia mensagem manualmente (fora da plataforma)
--      explicando como acessar a plataforma. Magic link automático fica para
--      uma fase futura, quando o Resend tiver domínio verificado.

BEGIN;

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_waitlist_approved_at ON waitlist (approved_at);

COMMENT ON COLUMN waitlist.approved_at IS
  'Timestamp da aprovação manual pelo admin. NULL = ainda pendente. Não dispara email automaticamente — admin contata por canal externo.';

COMMIT;
