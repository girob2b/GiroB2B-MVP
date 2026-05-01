-- Migration 033 — FTS + ranking composto para explorar

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.immutable_unaccent(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT unaccent(coalesce(value, ''));
$$;

CREATE OR REPLACE FUNCTION public.immutable_array_to_string(value TEXT[], delimiter TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT array_to_string(coalesce(value, ARRAY[]::TEXT[]), delimiter);
$$;

CREATE OR REPLACE FUNCTION public.pt_tsv_a(value TEXT)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT setweight(to_tsvector('portuguese', public.immutable_unaccent(coalesce(value, ''))), 'A');
$$;

CREATE OR REPLACE FUNCTION public.pt_tsv_b(value TEXT)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT setweight(to_tsvector('portuguese', public.immutable_unaccent(coalesce(value, ''))), 'B');
$$;

CREATE OR REPLACE FUNCTION public.pt_tsv_c(value TEXT)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT setweight(to_tsvector('portuguese', public.immutable_unaccent(coalesce(value, ''))), 'C');
$$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    public.pt_tsv_a(name)
    || public.pt_tsv_b(coalesce(description, ''))
    || public.pt_tsv_c(public.immutable_array_to_string(tags, ' '))
  ) STORED;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    public.pt_tsv_a(trade_name)
    || public.pt_tsv_b(coalesce(company_name, ''))
    || public.pt_tsv_c(coalesce(description, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON public.products USING gin (search_vector);

CREATE INDEX IF NOT EXISTS idx_suppliers_search_vector
  ON public.suppliers USING gin (search_vector);

CREATE OR REPLACE FUNCTION public.search_explorar(
  p_query TEXT,
  p_category_slug TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_supplier_types TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  supplier_id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  category_id UUID,
  category_slug TEXT,
  category_name TEXT,
  images TEXT[],
  unit TEXT,
  min_order INTEGER,
  price_min_cents INTEGER,
  price_max_cents INTEGER,
  tags TEXT[],
  supplier_name TEXT,
  supplier_slug TEXT,
  supplier_city TEXT,
  supplier_state TEXT,
  supplier_logo TEXT,
  is_verified BOOLEAN,
  supplier_plan TEXT,
  supplier_type TEXT,
  created_at TIMESTAMPTZ,
  rank_score NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH q AS (
    SELECT plainto_tsquery('portuguese', public.immutable_unaccent(coalesce(p_query, ''))) AS query
  )
  SELECT
    pl.id,
    pl.supplier_id,
    pl.name,
    pl.slug,
    pl.description,
    pl.category_id,
    pl.category_slug,
    pl.category_name,
    pl.images,
    pl.unit,
    pl.min_order,
    pl.price_min_cents,
    pl.price_max_cents,
    pl.tags,
    pl.supplier_name,
    pl.supplier_slug,
    pl.supplier_city,
    pl.supplier_state,
    pl.supplier_logo,
    pl.is_verified,
    pl.supplier_plan,
    pl.supplier_type,
    pl.created_at,
    (
      ts_rank_cd(p.search_vector, q.query) * 35
      + CASE pl.supplier_plan WHEN 'premium' THEN 25 WHEN 'pro' THEN 18 WHEN 'starter' THEN 10 ELSE 0 END
      + CASE WHEN pl.is_verified THEN 15 ELSE 0 END
      + CASE WHEN p_state IS NOT NULL AND pl.supplier_state = p_state THEN 15 ELSE 0 END
      + GREATEST(0, 10 - EXTRACT(DAY FROM (now() - pl.created_at)) / 30)
    )::NUMERIC AS rank_score
  FROM public.product_listings pl
  JOIN public.products p ON p.id = pl.id
  CROSS JOIN q
  WHERE
    (coalesce(p_query, '') = '' OR p.search_vector @@ q.query)
    AND (p_category_slug IS NULL OR pl.category_slug = p_category_slug)
    AND (p_state IS NULL OR pl.supplier_state = p_state)
    AND (p_supplier_types IS NULL OR pl.supplier_type = ANY(p_supplier_types))
  ORDER BY rank_score DESC, pl.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.search_explorar(TEXT, TEXT, TEXT, TEXT[], INTEGER, INTEGER) TO anon, authenticated;

