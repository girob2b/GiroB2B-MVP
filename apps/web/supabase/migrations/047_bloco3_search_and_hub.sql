-- Migration 047: Bloco 3 — busca facetada + hub de categorias
--
-- Itens implementados:
--   #7  busca-facetada-decente  — índice em contact_count para sort='contacts'
--   #9  hub-categorias          — sem migration de schema nova (query via embedded count)
--   #19 demandas-relacionadas   — param exclude_id em listPublicDemands (só TypeScript)
--   #5  trust-badges (parcial)  — adicionar buyer_member_since à view demands_public
--
-- Aplicação MANUAL via Supabase SQL Editor (não há staging; preview = prod).
-- Rollback comentado ao final.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Índice em demands.contact_count (suporte ao sort='contacts')
--
--    listPublicDemands com sort='contacts' ordena por contact_count DESC.
--    Sem índice, Postgres faz seq scan em demands_public (view sobre demands).
--    O índice parcial (WHERE status='open') cobre exatamente as rows da view.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_demands_contact_count_open
  ON demands (contact_count DESC)
  WHERE status = 'open';

COMMENT ON INDEX idx_demands_contact_count_open IS
  'Índice parcial para ordenação por "mais contatadas" no feed público (#7 busca-facetada-decente).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Adicionar buyer_member_since à view demands_public
--
--    Campo: buyers.created_at alias buyer_member_since.
--    Permite badge "membro desde {ano}" no trust-badges (#5).
--    NULL para guests (buyer_user_id IS NULL) — comportamento esperado.
--
--    A view é reconstruída com DROP + CREATE porque Postgres exige
--    preservar a ordem das colunas existentes para OR REPLACE.
--    whatsapp_number, guest_email, guest_whatsapp, guest_name continuam
--    AUSENTES — gate de PII mantido.
-- ─────────────────────────────────────────────────────────────────────────────

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
  -- Verificado: buyer cadastrado + CNPJ + razão social preenchidos.
  -- Guests (buyer_user_id IS NULL) nunca são verificados (COALESCE → FALSE).
  COALESCE(
    d.buyer_user_id IS NOT NULL
      AND b.cnpj IS NOT NULL AND b.cnpj <> ''
      AND b.company_name IS NOT NULL AND b.company_name <> '',
    FALSE
  ) AS buyer_is_verified,
  -- Data de cadastro do comprador. NULL para guests.
  -- Usado para badge "membro desde {ano}" no trust-badges (#5).
  b.created_at AS buyer_member_since
FROM demands d
LEFT JOIN buyers b ON b.user_id = d.buyer_user_id
WHERE d.status = 'open' AND d.expires_at > NOW();

GRANT SELECT ON demands_public TO anon, authenticated;

COMMENT ON VIEW demands_public IS
  'Versão pública das demands abertas. Sem whatsapp_number, guest_email, guest_whatsapp, guest_name.
   buyer_is_verified: TRUE quando buyer tem CNPJ+razão social (BrasilAPI off no MVP → quase sempre FALSE).
   buyer_member_since: created_at do buyer cadastrado; NULL para guests.
   Atualizada em 047 (2026-06-21): +buyer_member_since.';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (executar manualmente se precisar reverter):
--
-- DROP INDEX IF EXISTS idx_demands_contact_count_open;
--
-- DROP VIEW IF EXISTS demands_public;
-- CREATE VIEW demands_public AS
-- SELECT
--   d.id, d.slug, d.title, d.description, d.category_id, d.subcategory_slug,
--   d.quantity, d.unit, d.budget_max_cents, d.deadline,
--   d.delivery_city, d.delivery_state, d.photos_urls,
--   d.kind, d.items, d.payment_terms, d.delivery_terms, d.required_docs, d.attachment_url,
--   d.status, d.views_count, d.contact_count,
--   d.published_at, d.expires_at, d.created_at,
--   COALESCE(
--     d.buyer_user_id IS NOT NULL
--       AND b.cnpj IS NOT NULL AND b.cnpj <> ''
--       AND b.company_name IS NOT NULL AND b.company_name <> '',
--     FALSE
--   ) AS buyer_is_verified
-- FROM demands d
-- LEFT JOIN buyers b ON b.user_id = d.buyer_user_id
-- WHERE d.status = 'open' AND d.expires_at > NOW();
-- GRANT SELECT ON demands_public TO anon, authenticated;
--
-- ─────────────────────────────────────────────────────────────────────────────

COMMIT;
