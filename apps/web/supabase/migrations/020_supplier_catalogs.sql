-- 020_supplier_catalogs.sql
-- Catálogo de arquivos do fornecedor (PDF, imagens)

CREATE TABLE supplier_catalogs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  uuid        NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  title        text,
  file_url     text        NOT NULL,
  file_name    text        NOT NULL,
  file_size    integer,
  file_type    text        CHECK (file_type IN ('pdf', 'image')),
  display_order integer    DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_supplier_catalogs_supplier ON supplier_catalogs(supplier_id);

ALTER TABLE supplier_catalogs ENABLE ROW LEVEL SECURITY;

-- Supplier gerencia o próprio catálogo
CREATE POLICY "supplier_manage_own_catalogs"
  ON supplier_catalogs FOR ALL
  USING   (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()))
  WITH CHECK (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

-- Qualquer pessoa pode ler (perfil público + explorar)
CREATE POLICY "public_read_catalogs"
  ON supplier_catalogs FOR SELECT
  USING (true);

-- Storage bucket (público, max 20 MB, apenas PDF e imagens)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'supplier-catalogs',
  'supplier-catalogs',
  true,
  20971520,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: supplier só sobe para a própria pasta (supplier_id/)
CREATE POLICY "supplier_upload_own_catalogs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'supplier-catalogs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM suppliers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "supplier_delete_own_catalog_files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'supplier-catalogs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM suppliers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "public_read_catalog_files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'supplier-catalogs');
