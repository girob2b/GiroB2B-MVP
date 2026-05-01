-- ─── Migration 014: Product Relisting ───────────────────────────────────────
-- Permite que fornecedores importem produtos de outros fornecedores para o
-- catálogo deles como cópia independente (só imagem + nome).
-- Ver spec: docs/superpowers/specs/2026-04-11-revenda-produtos-design.md

-- 1. Opt-in global do fornecedor original ──────────────────────────────────
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS allow_relisting boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN suppliers.allow_relisting IS
  'Quando true, outros fornecedores podem copiar imagem+nome dos produtos deste supplier pro catálogo deles.';

-- 2. Lineage no produto ────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS original_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_resold boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN products.original_product_id IS
  'Se não-nulo, aponta pro produto raiz (do fornecedor original) de onde esta cópia foi importada.';

COMMENT ON COLUMN products.is_resold IS
  'Marca produtos que foram importados via feature de revenda. Mantido true mesmo se o original for deletado.';

-- 3. Adicionar estado draft ao CHECK constraint de products.status ─────────
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_status_check;

ALTER TABLE products
  ADD CONSTRAINT products_status_check
  CHECK (status IN ('active', 'paused', 'deleted', 'draft'));

-- 4. Índices ────────────────────────────────────────────────────────────────
-- Dedup rápida da busca pública (agrupa múltiplas cópias do mesmo original)
CREATE INDEX IF NOT EXISTS idx_products_original
  ON products(original_product_id)
  WHERE original_product_id IS NOT NULL;

-- Rate limit por revendedor (20 imports / 24h)
CREATE INDEX IF NOT EXISTS idx_products_resold_created
  ON products(supplier_id, created_at)
  WHERE is_resold = true;
