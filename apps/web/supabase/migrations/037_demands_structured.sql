-- Migration 037: modo "structured" (pedido tipo GOV.BR) na mesma tabela `demands`
-- Decisão de produto 2026-05-14: subtipo da mesma entidade, não nova tabela nem 2ª porta
-- na sidebar. Toggle Simple/Structured no demand-form em /painel/postar.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Enum demand_kind
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE demand_kind AS ENUM ('simple', 'structured');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Novas colunas em demands
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE demands
  ADD COLUMN IF NOT EXISTS kind             demand_kind NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS items            jsonb,
  ADD COLUMN IF NOT EXISTS payment_terms    text,
  ADD COLUMN IF NOT EXISTS delivery_terms   text,
  ADD COLUMN IF NOT EXISTS required_docs    text,
  ADD COLUMN IF NOT EXISTS attachment_url   text;

-- items deve ser array quando presente; structured exige >=1 item.
DO $$ BEGIN
  ALTER TABLE demands
    ADD CONSTRAINT chk_items_jsonb_array
      CHECK (items IS NULL OR jsonb_typeof(items) = 'array');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE demands
    ADD CONSTRAINT chk_structured_has_items
      CHECK (
        kind = 'simple'
        OR (kind = 'structured' AND items IS NOT NULL AND jsonb_array_length(items) >= 1)
      );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_demands_kind_open
  ON demands (kind) WHERE status = 'open';

COMMENT ON COLUMN demands.kind IS
  'simple = descrição livre (V0). structured = pedido tipo GOV.BR com items + condições. Subtipo da mesma tabela — sem split em 2 entidades.';
COMMENT ON COLUMN demands.items IS
  'Array de itens da proposta estruturada. Schema do elemento: { description: text, quantity: number, unit: text, specs?: text }. Obrigatório quando kind=structured.';
COMMENT ON COLUMN demands.payment_terms IS
  'Condições de pagamento — texto livre no V1 (ex: "30/60/90 dias"). V2: presets.';
COMMENT ON COLUMN demands.delivery_terms IS
  'Condições de entrega — texto livre (ex: Incoterm + endereço). V2: parsing estruturado.';
COMMENT ON COLUMN demands.required_docs IS
  'Documentos exigidos do fornecedor (ex: NF, certificados ISO, MSDS). Texto livre.';
COMMENT ON COLUMN demands.attachment_url IS
  'Object path do PDF no bucket demand-attachments (formato {auth_uid}/{filename}). NÃO URL completa — evita bypass de RLS via match por sufixo. URL pública é construída no client a partir do path. Leitura gated por RLS (apenas demands status=open + expires_at > now()).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Recriar view demands_public com novas colunas
-- Importante: a 036 criou a view com SELECT explícito. CREATE OR REPLACE VIEW
-- do Postgres exige preservar ordem das colunas existentes — como estamos
-- inserindo `kind`/`items`/etc no meio (depois de photos_urls), precisamos
-- DROP + CREATE. whatsapp_number continua omitido (gate de PII).
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS demands_public;
CREATE VIEW demands_public AS
SELECT
  id, slug, title, description,
  category_id, subcategory_slug,
  quantity, unit, budget_max_cents, deadline,
  delivery_city, delivery_state,
  photos_urls,
  kind, items, payment_terms, delivery_terms, required_docs, attachment_url,
  status, views_count, contact_count,
  published_at, expires_at, created_at
FROM demands
WHERE status = 'open' AND expires_at > NOW();

GRANT SELECT ON demands_public TO anon, authenticated;

COMMENT ON VIEW demands_public IS
  'Versão pública das demands sem whatsapp_number. Inclui campos do modo structured (kind, items, payment/delivery/required, attachment). Atualizada na migration 037 (2026-05-14).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Storage bucket demand-attachments (PDF do pedido estruturado)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'demand-attachments',
  'demand-attachments',
  true,
  10485760,                          -- 10 MB
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Upload: apenas o dono (buyer) na própria pasta {auth.uid}/...
DROP POLICY IF EXISTS "buyer_upload_own_demand_attachments" ON storage.objects;
CREATE POLICY "buyer_upload_own_demand_attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'demand-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "buyer_delete_own_demand_attachments" ON storage.objects;
CREATE POLICY "buyer_delete_own_demand_attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'demand-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura pública: SOMENTE quando há demand published cujo attachment_url
-- bate EXATAMENTE com o name do objeto. attachment_url passou a armazenar
-- só o object_path ({uid}/{file}), não a URL completa — match por igualdade
-- elimina bypass via colisão de sufixo (SecRev C1 — 2026-05-14).
DROP POLICY IF EXISTS "public_read_demand_attachments_when_published" ON storage.objects;
CREATE POLICY "public_read_demand_attachments_when_published"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'demand-attachments'
    AND EXISTS (
      SELECT 1 FROM demands d
      WHERE d.status = 'open'
        AND d.expires_at > NOW()
        AND d.attachment_url = storage.objects.name
    )
  );

-- Índice parcial pra acelerar a lookup acima quando o bucket crescer.
CREATE INDEX IF NOT EXISTS idx_demands_attachment_url_open
  ON demands (attachment_url)
  WHERE status = 'open' AND attachment_url IS NOT NULL;

COMMIT;
