-- Migration 039: view demands_public ganha flag buyer_is_verified.
--
-- Conecta a promessa do ProfileNudge ("compradores verificados aparecem em
-- destaque") à realidade visual do feed do supplier.
--
-- buyer_is_verified = TRUE quando o buyer linkado preencheu CNPJ +
-- company_name. NULL quando a demand não tem buyer_user_id (futuro guest).

BEGIN;

DROP VIEW IF EXISTS demands_public;

CREATE VIEW demands_public AS
SELECT
  d.id,
  d.slug,
  d.title,
  d.description,
  d.category_id,
  d.subcategory_slug,
  d.quantity,
  d.unit,
  d.budget_max_cents,
  d.deadline,
  d.delivery_city,
  d.delivery_state,
  d.photos_urls,
  d.kind,
  d.items,
  d.payment_terms,
  d.delivery_terms,
  d.required_docs,
  d.attachment_url,
  d.status,
  d.views_count,
  d.contact_count,
  d.published_at,
  d.expires_at,
  d.created_at,
  -- Verificado quando o buyer existe e preencheu CNPJ + razão social.
  COALESCE(
    b.cnpj IS NOT NULL AND b.cnpj <> '' AND b.company_name IS NOT NULL AND b.company_name <> '',
    FALSE
  ) AS buyer_is_verified
FROM demands d
LEFT JOIN buyers b ON b.user_id = d.buyer_user_id
WHERE d.status = 'open' AND d.expires_at > NOW();

GRANT SELECT ON demands_public TO anon, authenticated;

COMMENT ON VIEW demands_public IS
  'View pública das demands abertas. Inclui buyer_is_verified (CNPJ+razão social preenchidos) usado pelo feed do supplier pra destacar leads de alta confiança.';

COMMIT;
