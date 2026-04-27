-- ═══════════════════════════════════════════════════════════════════════════
--  Migration 027 — Endereço estruturado em buyers
--
--  Plataforma é B2B → buyer também precisa CNPJ + endereço completo pra
--  fazer ações (mandar cotação, etc.). Já tem cnpj/company_name/city/state.
--  Adiciona address (rua+número+bairro), cep e is_profile_complete (gate).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS cep     TEXT;

COMMENT ON COLUMN public.buyers.address IS 'Endereço completo: rua, número, bairro.';
COMMENT ON COLUMN public.buyers.cep     IS 'CEP do buyer (apenas dígitos).';
