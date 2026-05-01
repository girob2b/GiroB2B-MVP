-- Migration 032 — Eventos de busca e termos populares

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS public.search_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  filters JSONB DEFAULT '{}'::JSONB,
  results_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'explorar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_events_created_at
  ON public.search_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_events_normalized_created
  ON public.search_events (normalized_query, created_at DESC);

ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS search_events_anon_insert ON public.search_events;
CREATE POLICY search_events_anon_insert
  ON public.search_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.normalize_search_query(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(
    regexp_replace(
      regexp_replace(lower(unaccent(coalesce(value, ''))), '\d{6,}', '', 'g'),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.log_search_event(
  p_raw_query TEXT,
  p_filters JSONB DEFAULT '{}'::JSONB,
  p_results_count INTEGER DEFAULT 0,
  p_source TEXT DEFAULT 'explorar'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized TEXT;
BEGIN
  v_normalized := public.normalize_search_query(p_raw_query);
  IF length(v_normalized) < 2 THEN
    RETURN;
  END IF;

  INSERT INTO public.search_events (raw_query, normalized_query, filters, results_count, source)
  VALUES (p_raw_query, v_normalized, coalesce(p_filters, '{}'::jsonb), coalesce(p_results_count, 0), coalesce(p_source, 'explorar'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_search_event(TEXT, JSONB, INTEGER, TEXT) TO anon, authenticated;

CREATE OR REPLACE VIEW public.search_terms_popular AS
SELECT
  normalized_query AS term,
  count(*)::INTEGER AS hits,
  max(created_at) AS last_seen_at
FROM public.search_events
WHERE created_at >= now() - interval '7 days'
GROUP BY normalized_query
HAVING count(*) >= 3
ORDER BY hits DESC, last_seen_at DESC;

GRANT SELECT ON public.search_terms_popular TO anon, authenticated;

