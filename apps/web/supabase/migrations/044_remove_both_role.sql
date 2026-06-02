-- Migration 044: remove role "both" da plataforma.
--
-- Decisão de produto 2026-05-24 (Vitor): "both" foi um equívoco na concepção
-- do projeto. Modo de uso passa a ser BINÁRIO — buyer OU supplier, nunca os
-- dois ao mesmo tempo. Quem quiser trocar usa o fluxo /painel/perfil
-- (com aprovação admin + cooldown 2d).
--
-- Esta migration:
--   1. Sanitiza dados de teste com modo "both" (user_metadata.segment + role_change_requests)
--   2. Dropa "both" do CHECK constraint da tabela role_change_requests
--
-- Pré-condição confirmada com Vitor: dados em prod são teste, sem usuário real.
-- Em produção futura, antes de aplicar uma migration deste tipo, fazer
-- backup completo e verificar quantos users seriam afetados.

BEGIN;

-- ─── 1. Sanitiza user_metadata.segment de "both" → "supplier" ──────────────
-- "supplier" preserva acesso ao feed pago (decisão: assinatura > free).
-- Pra users sem supplier row, o (dashboard)/layout.tsx detecta no banco
-- e força "buyer" automaticamente (não corrompe sessão).
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{segment}',
  '"supplier"'
)
WHERE raw_user_meta_data->>'segment' = 'both';

-- Mesmo tratamento pro campo legado "role" se houver.
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"supplier"'
)
WHERE raw_user_meta_data->>'role' = 'both';

-- ─── 2. Sanitiza role_change_requests pendentes com "both" ─────────────────
-- Marca como 'rejected' qualquer pedido pendente pra/de "both" — não
-- vai mais ser servido. Comentário documenta o motivo.
UPDATE public.role_change_requests
SET status = 'rejected',
    admin_notes = COALESCE(admin_notes, '') ||
      E'\n[migration 044, 2026-05-24] Auto-rejeitado: modo "both" removido da plataforma.'
WHERE (current_mode = 'both' OR target_mode = 'both')
  AND status = 'pending';

-- Pra requests já processados (approved/rejected), apenas normaliza o
-- current_mode/target_mode pra "supplier" — mantém histórico legível.
UPDATE public.role_change_requests
SET current_mode = 'supplier'
WHERE current_mode = 'both';

UPDATE public.role_change_requests
SET target_mode = 'supplier'
WHERE target_mode = 'both';

-- ─── 3. Dropa "both" do CHECK constraint ───────────────────────────────────
ALTER TABLE public.role_change_requests
  DROP CONSTRAINT IF EXISTS role_change_requests_current_mode_check;

ALTER TABLE public.role_change_requests
  DROP CONSTRAINT IF EXISTS role_change_requests_target_mode_check;

ALTER TABLE public.role_change_requests
  ADD CONSTRAINT role_change_requests_current_mode_check
  CHECK (current_mode IN ('buyer', 'supplier'));

ALTER TABLE public.role_change_requests
  ADD CONSTRAINT role_change_requests_target_mode_check
  CHECK (target_mode  IN ('buyer', 'supplier'));

COMMIT;

-- ─── Notas operacionais ────────────────────────────────────────────────────
-- Como aplicar em produção:
--   Opção 1 (Supabase Dashboard): SQL Editor → cola este arquivo → Run.
--   Opção 2 (Management API): curl POST /v1/projects/<ref>/database/query
--           com PAT. Ver scripts/apply-migration.sh se existir.
--
-- Pós-aplicação, conferir:
--   SELECT count(*) FROM auth.users WHERE raw_user_meta_data->>'segment' = 'both';  -- esperado: 0
--   SELECT count(*) FROM public.role_change_requests WHERE current_mode = 'both' OR target_mode = 'both';  -- esperado: 0
