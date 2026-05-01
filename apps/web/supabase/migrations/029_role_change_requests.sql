-- ═══════════════════════════════════════════════════════════════════════════
--  Migration 029 — Pedidos de troca de tipo de conta (admin liberation)
--
--  User pode pedir troca entre buyer / supplier / both, mas a troca não é
--  imediata: precisa de aprovação manual de admin (regra de negócio anti-abuso
--  + auditoria). Enquanto pendente, role atual permanece.
--
--  Cooldown de 2 dias continua: user só pode abrir um novo request 2 dias
--  após o último processado (last_role_change_at).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.role_change_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  current_mode    TEXT NOT NULL CHECK (current_mode IN ('buyer','supplier','both')),
  target_mode     TEXT NOT NULL CHECK (target_mode  IN ('buyer','supplier','both')),

  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
  admin_notes     TEXT,

  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  processed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_role_change_user    ON public.role_change_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_status  ON public.role_change_requests (status);
CREATE INDEX IF NOT EXISTS idx_role_change_pending ON public.role_change_requests (user_id, requested_at DESC) WHERE status = 'pending';

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;

-- User vê e cria seus próprios requests
DROP POLICY IF EXISTS "user reads own requests" ON public.role_change_requests;
CREATE POLICY "user reads own requests"
  ON public.role_change_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user creates own requests" ON public.role_change_requests;
CREATE POLICY "user creates own requests"
  ON public.role_change_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin (user_profiles.role = 'admin') gerencia tudo
DROP POLICY IF EXISTS "admin manages all requests" ON public.role_change_requests;
CREATE POLICY "admin manages all requests"
  ON public.role_change_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );
