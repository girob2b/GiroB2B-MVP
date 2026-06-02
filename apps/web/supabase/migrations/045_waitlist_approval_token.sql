-- Migration 045: token de aprovação de vendedor + flow de cadastro pós-waitlist.
--
-- Decisão de produto 2026-05-24 (Vitor): "Sou vendedor" volta na raiz, mas
-- só quem foi APROVADO pelo admin via waitlist pode criar conta. Anônimos
-- novos continuam indo pra fluxo de waitlist.
--
-- Esta migration adiciona 3 colunas na tabela `waitlist`:
--   - approval_token         (UUID gerado quando user clica "já fui aprovado")
--   - approval_token_expires_at (TIMESTAMPTZ, default agora()+15min)
--   - approval_token_used_at (TIMESTAMPTZ — preenchido quando signup conclui;
--                              uso único pra evitar reaproveitamento do link)
--
-- O fluxo:
--   1. User clica "Já fui aprovado" em /seja-vendedor → modal pede email
--   2. POST /api/waitlist/check { email }
--      - waitlist.role='supplier' AND status='approved' AND NOT suspended
--      - gera approval_token (uuid_generate_v4) + expira em 15min, salva no row
--      - retorna { status: 'approved', token, ... }
--   3. UI renderiza botão "Continuar →" → /cadastro/vendedor?supplier_token=<uuid>
--   4. /cadastro/vendedor valida token (não-expirado, não-usado, status='approved')
--      - libera form de signup com email pré-preenchido + role=supplier
--   5. Após signup completo, marca approval_token_used_at = now()

BEGIN;

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS approval_token         UUID,
  ADD COLUMN IF NOT EXISTS approval_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_token_used_at TIMESTAMPTZ;

-- Index pra lookup rápido por token na validação do /cadastro/vendedor.
-- Partial index só nas rows com token ativo (não-usadas) — menor + mais rápido.
CREATE INDEX IF NOT EXISTS idx_waitlist_approval_token
  ON public.waitlist (approval_token)
  WHERE approval_token IS NOT NULL AND approval_token_used_at IS NULL;

-- Limpa tokens expirados não-usados em backgrounds futuros (sem cron por enquanto).
-- Apenas garante que rows com token expirado não bloqueiem outro pedido do mesmo email.
COMMENT ON COLUMN public.waitlist.approval_token IS
  'UUID temporário (15min) gerado quando user prova ser aprovado. Uso único.';
COMMENT ON COLUMN public.waitlist.approval_token_expires_at IS
  'Quando o approval_token deixa de ser válido (now()+15min na geração).';
COMMENT ON COLUMN public.waitlist.approval_token_used_at IS
  'Preenchido na conclusão do signup. Token usado nunca pode ser reaproveitado.';

COMMIT;
