-- Migration 042: permite publicação de demand sem cadastro (guest).
--
-- Decisão 2026-05-14: visitante anônimo pode publicar 1 necessidade fornecendo
-- nome + email + WhatsApp. Demand fica marcada como guest (sem badge Verificado).
-- Pra publicar a 2ª, é obrigatório criar conta. Reivindicação via cadastro
-- com o mesmo email fica como follow-up (não nesta migration).

BEGIN;

-- buyer_user_id passa a aceitar NULL (anônimo).
ALTER TABLE demands ALTER COLUMN buyer_user_id DROP NOT NULL;

-- Identificação do guest. Quando buyer_user_id é NULL, os 3 são obrigatórios.
ALTER TABLE demands
  ADD COLUMN IF NOT EXISTS guest_name      TEXT,
  ADD COLUMN IF NOT EXISTS guest_email     TEXT,
  ADD COLUMN IF NOT EXISTS guest_whatsapp  TEXT;

-- CHECK: ou é authenticated (buyer_user_id) ou guest (email + whatsapp).
ALTER TABLE demands DROP CONSTRAINT IF EXISTS demands_buyer_or_guest;
ALTER TABLE demands ADD CONSTRAINT demands_buyer_or_guest CHECK (
  (buyer_user_id IS NOT NULL)
  OR (guest_email IS NOT NULL AND guest_whatsapp IS NOT NULL)
);

-- Lowercase + trim do guest_email pra dedup confiável.
ALTER TABLE demands DROP CONSTRAINT IF EXISTS demands_guest_email_lowercase;
ALTER TABLE demands ADD CONSTRAINT demands_guest_email_lowercase CHECK (
  guest_email IS NULL OR guest_email = lower(guest_email)
);

-- Índice usado pelo limite "1 necessidade por email guest" e por uma futura
-- claim flow (cadastro com mesmo email transfere demands).
CREATE INDEX IF NOT EXISTS idx_demands_guest_email
  ON demands (guest_email)
  WHERE guest_email IS NOT NULL;

-- ─── RLS: anônimos podem inserir guest demand (com validação no app)  ───
-- Permitimos INSERT anônimo, mas SOMENTE quando todos os 3 campos guest
-- estão presentes e buyer_user_id é NULL. Read da própria demand não é
-- liberado pra anon — só visível pela view demands_public.
DROP POLICY IF EXISTS demands_anon_insert ON demands;
CREATE POLICY demands_anon_insert ON demands
  FOR INSERT TO anon
  WITH CHECK (
    buyer_user_id IS NULL
    AND guest_email IS NOT NULL
    AND guest_whatsapp IS NOT NULL
    AND guest_name IS NOT NULL
    AND status = 'open'
    AND lgpd_consent = TRUE
  );

-- ─── Atualiza demands_public pra expor buyer_is_verified=false em guests ──
DROP VIEW IF EXISTS demands_public;
CREATE VIEW demands_public AS
SELECT
  d.id, d.slug, d.title, d.description, d.category_id, d.subcategory_slug,
  d.quantity, d.unit, d.budget_max_cents, d.deadline,
  d.delivery_city, d.delivery_state, d.photos_urls,
  d.kind, d.items, d.payment_terms, d.delivery_terms, d.required_docs, d.attachment_url,
  d.status, d.views_count, d.contact_count,
  d.published_at, d.expires_at, d.created_at,
  -- Verificado: precisa ter buyer cadastrado + CNPJ + razão social.
  -- Guests nunca são verificados.
  COALESCE(
    d.buyer_user_id IS NOT NULL
      AND b.cnpj IS NOT NULL AND b.cnpj <> ''
      AND b.company_name IS NOT NULL AND b.company_name <> '',
    FALSE
  ) AS buyer_is_verified
FROM demands d
LEFT JOIN buyers b ON b.user_id = d.buyer_user_id
WHERE d.status = 'open' AND d.expires_at > NOW();

GRANT SELECT ON demands_public TO anon, authenticated;

COMMIT;
