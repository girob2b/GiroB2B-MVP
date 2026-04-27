-- ═══════════════════════════════════════════════════════════════════════════
--  Migration 028 — Inscrições municipal/estadual em buyers
--
--  Plataforma B2B → buyer também declara inscrições fiscais (mesmo padrão
--  que suppliers já têm). Opcional pois nem toda empresa tem ambas (ex.: MEI).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT,
  ADD COLUMN IF NOT EXISTS inscricao_estadual  TEXT;

COMMENT ON COLUMN public.buyers.inscricao_municipal IS 'Inscrição municipal (opcional — varia por município).';
COMMENT ON COLUMN public.buyers.inscricao_estadual  IS 'Inscrição estadual (opcional — isento/não-contribuinte aceito).';
