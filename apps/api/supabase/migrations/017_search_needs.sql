-- ═══════════════════════════════════════════════════════════════════════════
--  Migration 017 — Lista de necessidades do comprador
--
--  Quando um buyer pesquisa algo que a base interna não cobre e não tem
--  acesso à "Pesquisa na web" (feature gated), ele pode registrar a
--  necessidade. Admins processam manualmente e cadastram o fornecedor
--  alimentando a base interna (T2-11).
--
--  Ver docs/MVP_SCOPE.md §4 (Tier 2) e docs/WEB_SCRAPING.md.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.search_needs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  query        TEXT NOT NULL,
  description  TEXT,
  filters      JSONB DEFAULT '{}'::JSONB,

  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'in_progress', 'fulfilled', 'rejected')),
  admin_notes  TEXT,

  resolved_by_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  resolved_by_admin_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_search_needs_user      ON public.search_needs (user_id);
CREATE INDEX IF NOT EXISTS idx_search_needs_status    ON public.search_needs (status);
CREATE INDEX IF NOT EXISTS idx_search_needs_created   ON public.search_needs (created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at_search_needs()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_search_needs_updated_at ON public.search_needs;
CREATE TRIGGER trg_search_needs_updated_at
  BEFORE UPDATE ON public.search_needs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_search_needs();

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.search_needs ENABLE ROW LEVEL SECURITY;

-- Usuário autenticado lê/insere seus próprios registros.
DROP POLICY IF EXISTS "search_needs_owner_select" ON public.search_needs;
CREATE POLICY "search_needs_owner_select"
  ON public.search_needs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "search_needs_owner_insert" ON public.search_needs;
CREATE POLICY "search_needs_owner_insert"
  ON public.search_needs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin (via user_profiles.role = 'admin') pode ler, atualizar e deletar qualquer necessidade.
DROP POLICY IF EXISTS "search_needs_admin_all" ON public.search_needs;
CREATE POLICY "search_needs_admin_all"
  ON public.search_needs FOR ALL
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

-- ── Flag de acesso à busca web no user_profiles ───────────────────────────
-- Default false: a feature fica gated. Owners/allowlist liberam via email
-- hardcoded OR esta flag na tabela user_profiles (T2-12).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS can_use_web_search BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_profiles.can_use_web_search IS
  'Feature flag — libera a "Pesquisa na web" para este usuário. Default false. Ver MVP_SCOPE.md T2-12.';
