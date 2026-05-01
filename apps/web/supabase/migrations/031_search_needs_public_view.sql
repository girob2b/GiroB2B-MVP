-- Migration 031 — View publica sanitizada para necessidades recentes

CREATE OR REPLACE VIEW public.search_needs_public AS
SELECT
  id,
  query,
  description,
  filters,
  created_at
FROM public.search_needs
WHERE status = 'pending';

GRANT SELECT ON public.search_needs_public TO anon, authenticated;

DROP POLICY IF EXISTS search_needs_public_anon_select ON public.search_needs;
CREATE POLICY search_needs_public_anon_select
  ON public.search_needs FOR SELECT
  TO anon
  USING (status = 'pending');

