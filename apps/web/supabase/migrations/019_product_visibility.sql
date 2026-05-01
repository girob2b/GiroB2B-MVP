-- 019_product_visibility.sql
-- Adds visibility flag to products (global = appears in public search, chat_only = hidden from listings)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'global'
  CHECK (visibility IN ('global', 'chat_only'));

CREATE INDEX IF NOT EXISTS idx_products_visibility ON products(visibility);

-- Recreate product_listings view to include visibility column
-- (chat_only products are excluded from the public listing)
-- DROP first: CREATE OR REPLACE cannot reorder existing columns
DROP VIEW IF EXISTS product_listings;

CREATE VIEW product_listings AS
  SELECT
    p.id,
    p.supplier_id,
    p.name,
    p.slug,
    p.description,
    p.category_id,
    p.images,
    p.unit,
    p.min_order,
    p.price_min_cents,
    p.price_max_cents,
    p.tags,
    p.views_count,
    p.inquiry_count,
    p.visibility,
    p.created_at,
    s.trade_name    AS supplier_name,
    s.slug          AS supplier_slug,
    s.city          AS supplier_city,
    s.state         AS supplier_state,
    s.is_verified,
    s.plan          AS supplier_plan,
    s.logo_url      AS supplier_logo,
    s.profile_completeness,
    s.supplier_type,
    c.name          AS category_name,
    c.slug          AS category_slug
  FROM products p
  JOIN suppliers s ON p.supplier_id = s.id
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE p.status = 'active'
    AND p.visibility = 'global'
    AND s.suspended = FALSE;
