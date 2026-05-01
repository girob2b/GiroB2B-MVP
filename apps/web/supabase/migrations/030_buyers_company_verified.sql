-- ═══════════════════════════════════════════════════════════════════════════
--  Migration 030 — Selo "Empresa Verificada" para buyers
--
--  RF-01.14 / RN-01.06: buyer que informa CNPJ ATIVO (validado via BrasilAPI)
--  recebe o selo "Empresa Verificada". Selo é visível ao supplier ANTES do
--  desbloqueio do contato — qualifica o lead.
--
--  CNPJ permanece OPCIONAL no buyer (RN-01.06). Sem CNPJ ou com CNPJ inativo
--  → selo não concedido, mas buyer não é bloqueado.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS is_company_verified  BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cnpj_verified_at     TIMESTAMPTZ;

COMMENT ON COLUMN public.buyers.is_company_verified IS
  'TRUE quando o CNPJ do buyer foi validado como ATIVO na Receita Federal (BrasilAPI). RF-01.14.';
COMMENT ON COLUMN public.buyers.cnpj_verified_at    IS
  'Timestamp da última validação positiva do CNPJ. NULL se nunca validado.';

-- Backfill: buyer que já tem CNPJ definido NÃO é assumido como verificado —
-- o campo só vira TRUE após uma chamada explícita à BrasilAPI (no próximo
-- save do perfil ou via job de re-validação).
