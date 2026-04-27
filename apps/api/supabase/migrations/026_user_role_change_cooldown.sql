-- ═══════════════════════════════════════════════════════════════════════════
--  Migration 026 — Cooldown de troca de tipo de conta
--
--  User pode trocar entre buyer / supplier / both depois do onboarding, mas
--  não com frequência. Gravamos a última mudança em last_role_change_at e
--  bloqueamos novas trocas por 2 dias (regra anti-abuso).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_role_change_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_profiles.last_role_change_at IS
  'Última vez que o usuário alterou o tipo de conta (add/remove buyer ou supplier). Cooldown padrão: 2 dias.';
