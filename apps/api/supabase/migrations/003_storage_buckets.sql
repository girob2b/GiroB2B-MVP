-- ============================================================
-- GiroB2B — Storage Buckets
-- Executar no SQL Editor do Supabase (usa a extensão storage)
-- ============================================================

-- Criar buckets públicos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('supplier-logos',  'supplier-logos',  TRUE, 2097152,  ARRAY['image/jpeg','image/png','image/webp']),
  ('supplier-photos', 'supplier-photos', TRUE, 5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('product-images',  'product-images',  TRUE, 5242880,  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Políticas: leitura pública
CREATE POLICY "Public read supplier-logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'supplier-logos');

CREATE POLICY "Public read supplier-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'supplier-photos');

CREATE POLICY "Public read product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Políticas: upload apenas para usuários autenticados
CREATE POLICY "Auth upload supplier-logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'supplier-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Auth upload supplier-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'supplier-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Auth upload product-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Políticas: delete apenas do próprio arquivo (path começa com supplier.id)
CREATE POLICY "Auth delete own supplier-logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'supplier-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Auth delete own supplier-photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'supplier-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Auth delete own product-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
