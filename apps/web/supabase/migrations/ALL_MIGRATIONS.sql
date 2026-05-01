-- ============================================================
-- GiroB2B — Todas as Migrations (001 → 004)
-- Cole TUDO isso no SQL Editor do Supabase e clique em Run
-- ============================================================

-- ============================================================
-- EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- CATEGORIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  icon        TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug   ON categories(slug);

-- ============================================================
-- PERFIS DE USUÁRIO
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'supplier', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  INSERT INTO public.user_profiles (id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'));
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FORNECEDORES
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cnpj                 TEXT UNIQUE NOT NULL,
  company_name         TEXT NOT NULL,
  trade_name           TEXT NOT NULL,
  slug                 TEXT UNIQUE NOT NULL,
  description          TEXT,
  logo_url             TEXT,
  city                 TEXT NOT NULL,
  state                TEXT NOT NULL CHECK (char_length(state) = 2),
  address              TEXT,
  phone                TEXT NOT NULL,
  whatsapp             TEXT,
  website              TEXT,
  instagram            TEXT,
  linkedin             TEXT,
  founded_year         INT CHECK (founded_year >= 1800 AND founded_year <= EXTRACT(YEAR FROM NOW())),
  employee_count       TEXT CHECK (employee_count IN ('1-5','6-10','11-50','51-200','201-500','500+')),
  operating_hours      TEXT,
  categories           UUID[],
  photos               TEXT[],
  profile_completeness INT NOT NULL DEFAULT 0 CHECK (profile_completeness BETWEEN 0 AND 100),
  plan                 TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','starter','pro','premium')),
  plan_expires_at      TIMESTAMPTZ,
  is_verified          BOOLEAN NOT NULL DEFAULT FALSE,
  cnpj_status          TEXT,
  suspended            BOOLEAN NOT NULL DEFAULT FALSE,
  suspension_reason    TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_city       ON suppliers(city);
CREATE INDEX IF NOT EXISTS idx_suppliers_state      ON suppliers(state);
CREATE INDEX IF NOT EXISTS idx_suppliers_plan       ON suppliers(plan);
CREATE INDEX IF NOT EXISTS idx_suppliers_slug       ON suppliers(slug);
CREATE INDEX IF NOT EXISTS idx_suppliers_categories ON suppliers USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_suppliers_fts        ON suppliers USING GIN(
  to_tsvector('portuguese'::regconfig, trade_name || ' ' || COALESCE(description, '') || ' ' || city || ' ' || state)
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$func$;

DROP TRIGGER IF EXISTS suppliers_updated_at ON suppliers;
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PRODUTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  subcategory_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  images          TEXT[],
  unit            TEXT,
  min_order       INT CHECK (min_order > 0),
  price_min_cents INT CHECK (price_min_cents > 0),
  price_max_cents INT CHECK (price_max_cents >= price_min_cents),
  tags            TEXT[],
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','deleted')),
  deleted_at      TIMESTAMPTZ,
  views_count     INT NOT NULL DEFAULT 0,
  inquiry_count   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_global_slug ON products(slug) WHERE status != 'deleted';
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier   ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_status     ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_fts        ON products USING GIN(
  to_tsvector('portuguese'::regconfig, name || ' ' || COALESCE(description, ''))
);

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- COMPRADORES
-- ============================================================
CREATE TABLE IF NOT EXISTS buyers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT,
  email           TEXT NOT NULL,
  phone           TEXT,
  company         TEXT,
  city            TEXT,
  state           TEXT,
  lgpd_consent    BOOLEAN NOT NULL DEFAULT FALSE,
  lgpd_consent_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyers_email ON buyers(email);

-- ============================================================
-- INQUIRIES (RFQs)
-- ============================================================
CREATE TABLE IF NOT EXISTS inquiries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id      UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  buyer_id         UUID REFERENCES buyers(id) ON DELETE SET NULL,
  buyer_name       TEXT NOT NULL,
  buyer_email      TEXT NOT NULL,
  buyer_phone      TEXT,
  buyer_company    TEXT,
  buyer_city       TEXT,
  description      TEXT NOT NULL,
  quantity         TEXT,
  deadline         TEXT,
  status           TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','viewed','replied','archived','spam')),
  viewed_at        TIMESTAMPTZ,
  replied_at       TIMESTAMPTZ,
  contact_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  credits_used     INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_supplier   ON inquiries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status     ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);

-- ============================================================
-- RATE LIMIT DE INQUIRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS inquiry_rate_limits (
  buyer_email TEXT NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  count       INT NOT NULL DEFAULT 1,
  PRIMARY KEY (buyer_email, date)
);

-- ============================================================
-- LOG DE EMAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS email_notifications (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type      TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject   TEXT NOT NULL,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status    TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','bounced'))
);

-- ============================================================
-- VIEW: LISTAGEM PÚBLICA DE PRODUTOS
-- ============================================================
CREATE OR REPLACE VIEW product_listings AS
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
    p.created_at,
    s.trade_name    AS supplier_name,
    s.slug          AS supplier_slug,
    s.city          AS supplier_city,
    s.state         AS supplier_state,
    s.is_verified,
    s.plan          AS supplier_plan,
    s.logo_url      AS supplier_logo,
    s.profile_completeness,
    c.name          AS category_name,
    c.slug          AS category_slug
  FROM products p
  JOIN suppliers s ON p.supplier_id = s.id
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE p.status = 'active'
    AND s.suspended = FALSE;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile"   ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"   ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active suppliers" ON suppliers;
DROP POLICY IF EXISTS "Suppliers manage own profile"     ON suppliers;
CREATE POLICY "Public can view active suppliers" ON suppliers FOR SELECT USING (suspended = FALSE);
CREATE POLICY "Suppliers manage own profile"     ON suppliers FOR ALL    USING (auth.uid() = user_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active products" ON products;
DROP POLICY IF EXISTS "Suppliers manage own products"   ON products;
CREATE POLICY "Public can view active products" ON products FOR SELECT USING (status = 'active');
CREATE POLICY "Suppliers manage own products"   ON products FOR ALL
  USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active categories" ON categories;
DROP POLICY IF EXISTS "Admins manage categories"          ON categories;
CREATE POLICY "Public can view active categories" ON categories FOR SELECT USING (active = TRUE);
CREATE POLICY "Admins manage categories"          ON categories FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Buyers view own data"   ON buyers;
DROP POLICY IF EXISTS "Buyers manage own data" ON buyers;
CREATE POLICY "Buyers view own data"   ON buyers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Buyers manage own data" ON buyers FOR ALL    USING (auth.uid() = user_id);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Suppliers view own inquiries"   ON inquiries;
DROP POLICY IF EXISTS "Suppliers update own inquiries" ON inquiries;
CREATE POLICY "Suppliers view own inquiries"   ON inquiries FOR SELECT
  USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));
CREATE POLICY "Suppliers update own inquiries" ON inquiries FOR UPDATE
  USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

-- ============================================================
-- SEED: CATEGORIAS
-- ============================================================
INSERT INTO categories (id, name, slug, parent_id, icon, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Embalagens',               'embalagens',            NULL, '📦', 1),
  ('11111111-0000-0000-0000-000000000002', 'Alimentos e Bebidas',       'alimentos-bebidas',      NULL, '🍽️', 2),
  ('11111111-0000-0000-0000-000000000003', 'Materiais de Construção',   'materiais-construcao',   NULL, '🏗️', 3),
  ('11111111-0000-0000-0000-000000000004', 'Têxtil e Confecção',        'textil-confeccao',       NULL, '🧵', 4),
  ('11111111-0000-0000-0000-000000000005', 'Autopeças',                 'autopecas',              NULL, '🔧', 5),
  ('11111111-0000-0000-0000-000000000006', 'Indústria e Manufatura',    'industria-manufatura',   NULL, '🏭', 6),
  ('11111111-0000-0000-0000-000000000007', 'Tecnologia e Informática',  'tecnologia-informatica', NULL, '💻', 7),
  ('11111111-0000-0000-0000-000000000008', 'Serviços Empresariais',     'servicos-empresariais',  NULL, '💼', 8),
  ('11111111-0000-0000-0000-000000000009', 'Limpeza e Higiene',         'limpeza-higiene',        NULL, '🧹', 9),
  ('11111111-0000-0000-0000-000000000010', 'Agronegócio',               'agronegocio',            NULL, '🌱', 10)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
  ('Embalagens Plásticas',          'embalagens-plasticas',          '11111111-0000-0000-0000-000000000001', 1),
  ('Embalagens de Papel e Papelão', 'embalagens-papel-papelao',      '11111111-0000-0000-0000-000000000001', 2),
  ('Embalagens de Vidro',           'embalagens-vidro',              '11111111-0000-0000-0000-000000000001', 3),
  ('Embalagens Flexíveis',          'embalagens-flexiveis',          '11111111-0000-0000-0000-000000000001', 4),
  ('Embalagens Metálicas',          'embalagens-metalicas',          '11111111-0000-0000-0000-000000000001', 5),
  ('Sacolas e Sacos',               'sacolas-sacos',                 '11111111-0000-0000-0000-000000000001', 6),
  ('Insumos Industriais',           'insumos-industriais-alimentos', '11111111-0000-0000-0000-000000000002', 1),
  ('Ingredientes e Aditivos',       'ingredientes-aditivos',         '11111111-0000-0000-0000-000000000002', 2),
  ('Embalagens para Alimentos',     'embalagens-alimentos',          '11111111-0000-0000-0000-000000000002', 3),
  ('Equipamentos para Alimentos',   'equipamentos-alimentos',        '11111111-0000-0000-0000-000000000002', 4),
  ('Bebidas para Revenda',          'bebidas-revenda',               '11111111-0000-0000-0000-000000000002', 5),
  ('Cimento e Argamassa',           'cimento-argamassa',             '11111111-0000-0000-0000-000000000003', 1),
  ('Aço e Metais',                  'aco-metais',                    '11111111-0000-0000-0000-000000000003', 2),
  ('Cerâmica e Porcelanato',        'ceramica-porcelanato',          '11111111-0000-0000-0000-000000000003', 3),
  ('Tintas e Vernizes',             'tintas-vernizes',               '11111111-0000-0000-0000-000000000003', 4),
  ('Madeira e Derivados',           'madeira-derivados',             '11111111-0000-0000-0000-000000000003', 5),
  ('Hidráulica e Elétrica',         'hidraulica-eletrica',           '11111111-0000-0000-0000-000000000003', 6),
  ('Tecidos e Malhas',              'tecidos-malhas',                '11111111-0000-0000-0000-000000000004', 1),
  ('Aviamentos e Acessórios',       'aviamentos-acessorios',         '11111111-0000-0000-0000-000000000004', 2),
  ('Máquinas de Costura',           'maquinas-costura',              '11111111-0000-0000-0000-000000000004', 3),
  ('Uniformes e EPIs',              'uniformes-epis',                '11111111-0000-0000-0000-000000000004', 4),
  ('Roupas para Revenda',           'roupas-revenda',                '11111111-0000-0000-0000-000000000004', 5),
  ('Peças para Carros',             'pecas-carros',                  '11111111-0000-0000-0000-000000000005', 1),
  ('Peças para Caminhões',          'pecas-caminhoes',               '11111111-0000-0000-0000-000000000005', 2),
  ('Pneus e Rodas',                 'pneus-rodas',                   '11111111-0000-0000-0000-000000000005', 3),
  ('Acessórios Automotivos',        'acessorios-automotivos',        '11111111-0000-0000-0000-000000000005', 4),
  ('Lubrificantes e Fluidos',       'lubrificantes-fluidos',         '11111111-0000-0000-0000-000000000005', 5),
  ('Matérias-Primas',               'materias-primas',               '11111111-0000-0000-0000-000000000006', 1),
  ('Ferramentas Industriais',       'ferramentas-industriais',       '11111111-0000-0000-0000-000000000006', 2),
  ('Peças e Componentes',           'pecas-componentes',             '11111111-0000-0000-0000-000000000006', 3),
  ('Produtos Químicos',             'produtos-quimicos',             '11111111-0000-0000-0000-000000000006', 4),
  ('Máquinas e Equipamentos',       'maquinas-equipamentos',         '11111111-0000-0000-0000-000000000006', 5),
  ('Metais e Ligas',                'metais-ligas',                  '11111111-0000-0000-0000-000000000006', 6),
  ('Hardware e Periféricos',        'hardware-perifericos',          '11111111-0000-0000-0000-000000000007', 1),
  ('Software e Licenças',           'software-licencas',             '11111111-0000-0000-0000-000000000007', 2),
  ('Serviços de TI',                'servicos-ti',                   '11111111-0000-0000-0000-000000000007', 3),
  ('Telecomunicações',              'telecomunicacoes',              '11111111-0000-0000-0000-000000000007', 4),
  ('Logística e Transporte',        'logistica-transporte',          '11111111-0000-0000-0000-000000000008', 1),
  ('Marketing e Publicidade',       'marketing-publicidade',         '11111111-0000-0000-0000-000000000008', 2),
  ('Consultoria Empresarial',       'consultoria-empresarial',       '11111111-0000-0000-0000-000000000008', 3),
  ('Contabilidade e Financeiro',    'contabilidade-financeiro',      '11111111-0000-0000-0000-000000000008', 4),
  ('Insumos Agrícolas',             'insumos-agricolas',             '11111111-0000-0000-0000-000000000010', 1),
  ('Máquinas Agrícolas',            'maquinas-agricolas',            '11111111-0000-0000-0000-000000000010', 2),
  ('Grãos e Commodities',           'graos-commodities',             '11111111-0000-0000-0000-000000000010', 3),
  ('Defensivos Agrícolas',          'defensivos-agricolas',          '11111111-0000-0000-0000-000000000010', 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('supplier-logos',  'supplier-logos',  TRUE, 2097152,  ARRAY['image/jpeg','image/png','image/webp']),
  ('supplier-photos', 'supplier-photos', TRUE, 5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('product-images',  'product-images',  TRUE, 5242880,  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read supplier-logos"  ON storage.objects;
DROP POLICY IF EXISTS "Public read supplier-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read product-images"  ON storage.objects;
DROP POLICY IF EXISTS "Auth upload supplier-logos"  ON storage.objects;
DROP POLICY IF EXISTS "Auth upload supplier-photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload product-images"  ON storage.objects;
DROP POLICY IF EXISTS "Auth delete own supplier-logos"  ON storage.objects;
DROP POLICY IF EXISTS "Auth delete own supplier-photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete own product-images"  ON storage.objects;

CREATE POLICY "Public read supplier-logos"  ON storage.objects FOR SELECT USING (bucket_id = 'supplier-logos');
CREATE POLICY "Public read supplier-photos" ON storage.objects FOR SELECT USING (bucket_id = 'supplier-photos');
CREATE POLICY "Public read product-images"  ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Auth upload supplier-logos"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'supplier-logos'  AND auth.role() = 'authenticated');
CREATE POLICY "Auth upload supplier-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'supplier-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth upload product-images"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images'  AND auth.role() = 'authenticated');

CREATE POLICY "Auth delete own supplier-logos"  ON storage.objects FOR DELETE USING (bucket_id = 'supplier-logos'  AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete own supplier-photos" ON storage.objects FOR DELETE USING (bucket_id = 'supplier-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete own product-images"  ON storage.objects FOR DELETE USING (bucket_id = 'product-images'  AND auth.role() = 'authenticated');


-- ============================================================
-- Migration 005: Onboarding segments & purchase frequency
-- ============================================================

ALTER TABLE buyers
  ADD COLUMN IF NOT EXISTS segments          TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS purchase_frequency TEXT
    CHECK (purchase_frequency IN ('daily', 'weekly', 'monthly', 'occasionally'));

-- ============================================================
-- Migration 006: suppliers optional location
-- ============================================================

ALTER TABLE suppliers
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN state DROP NOT NULL;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
    FROM pg_constraint
   WHERE conrelid = 'public.suppliers'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) LIKE '%char_length(state)%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE suppliers DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END;
$$;

ALTER TABLE suppliers
  ADD CONSTRAINT suppliers_state_len
  CHECK (state IS NULL OR state = '' OR char_length(state) = 2);

-- ============================================================
-- Migration 007: supplier fiscal fields
-- ============================================================

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT,
  ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT,
  ADD COLUMN IF NOT EXISTS situacao_fiscal TEXT
    CHECK (
      situacao_fiscal IS NULL OR situacao_fiscal IN (
        'simples_nacional',
        'mei',
        'lucro_presumido',
        'lucro_real',
        'lucro_arbitrado',
        'imune',
        'isento',
        'outros'
      )
    );

-- ============================================================
-- Migration 008: search suggestions
-- ============================================================

CREATE OR REPLACE FUNCTION search_suggestions(search_term TEXT)
RETURNS TABLE (
  type TEXT,
  id UUID,
  label TEXT,
  slug TEXT,
  city TEXT,
  state TEXT
)
LANGUAGE sql
AS $$
  SELECT 'supplier'::TEXT, s.id, s.trade_name, s.slug, s.city, s.state
  FROM suppliers s
  WHERE s.suspended = FALSE
    AND s.trade_name ILIKE search_term || '%'

  UNION ALL

  SELECT 'category'::TEXT, c.id, c.name, c.slug, NULL::TEXT, NULL::TEXT
  FROM categories c
  WHERE c.active = TRUE
    AND c.name ILIKE search_term || '%'

  ORDER BY type, label
  LIMIT 10;
$$;

-- ============================================================
-- Migration 009: public profile layout
-- ============================================================

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS public_profile_layout JSONB;

-- ============================================================
-- Migration 010: identity level-1 foundation
-- ============================================================

ALTER TABLE IF EXISTS user_profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT;

ALTER TABLE IF EXISTS user_profiles
  ALTER COLUMN role SET DEFAULT 'user';

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
    FROM pg_constraint
   WHERE conrelid = 'public.user_profiles'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) LIKE '%role IN%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.user_profiles DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END;
$$;

ALTER TABLE IF EXISTS user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('user', 'buyer', 'supplier', 'admin'));

ALTER TABLE IF EXISTS user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_state_len;

ALTER TABLE IF EXISTS user_profiles
  ADD CONSTRAINT user_profiles_state_len
  CHECK (state IS NULL OR state = '' OR char_length(state) = 2);

UPDATE public.user_profiles up
SET
  role = COALESCE(NULLIF(au.raw_user_meta_data->>'role', ''), 'user'),
  full_name = COALESCE(up.full_name, NULLIF(au.raw_user_meta_data->>'full_name', '')),
  phone = COALESCE(up.phone, NULLIF(au.raw_user_meta_data->>'phone', '')),
  city = COALESCE(up.city, NULLIF(au.raw_user_meta_data->>'city', '')),
  state = COALESCE(up.state, NULLIF(au.raw_user_meta_data->>'state', ''))
FROM auth.users au
WHERE au.id = up.id;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  INSERT INTO public.user_profiles (id, role, full_name, phone, city, state)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'city', ''),
    NULLIF(NEW.raw_user_meta_data->>'state', '')
  );
  RETURN NEW;
END;
$func$;

-- ============================================================
-- Migration 011: Lazy buyer activation + directed inquiries
-- ============================================================

ALTER TABLE IF EXISTS buyers
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE buyers
SET company_name = COALESCE(company_name, company)
WHERE company_name IS NULL
  AND company IS NOT NULL;

DROP TRIGGER IF EXISTS buyers_updated_at ON buyers;
CREATE TRIGGER buyers_updated_at
  BEFORE UPDATE ON buyers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE IF EXISTS inquiries
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inquiry_type TEXT NOT NULL DEFAULT 'directed',
  ADD COLUMN IF NOT EXISTS quantity_estimate TEXT,
  ADD COLUMN IF NOT EXISTS desired_deadline TEXT,
  ADD COLUMN IF NOT EXISTS max_proposals INT,
  ADD COLUMN IF NOT EXISTS buyer_state TEXT,
  ADD COLUMN IF NOT EXISTS buyer_consent_to_share BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS report_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unlocked_by_credit BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dedup_key VARCHAR(64),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE inquiries
SET quantity_estimate = COALESCE(quantity_estimate, quantity)
WHERE quantity_estimate IS NULL
  AND quantity IS NOT NULL;

UPDATE inquiries
SET desired_deadline = COALESCE(desired_deadline, deadline)
WHERE desired_deadline IS NULL
  AND deadline IS NOT NULL;

UPDATE inquiries
SET responded_at = COALESCE(responded_at, replied_at)
WHERE responded_at IS NULL
  AND replied_at IS NOT NULL;

UPDATE inquiries
SET buyer_consent_to_share = TRUE
WHERE buyer_consent_to_share IS DISTINCT FROM TRUE;

UPDATE inquiries
SET inquiry_type = 'directed'
WHERE inquiry_type IS NULL
   OR inquiry_type = '';

UPDATE inquiries
SET status = CASE status
  WHEN 'replied' THEN 'responded'
  WHEN 'spam' THEN 'reported'
  ELSE status
END
WHERE status IN ('replied', 'spam');

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.inquiries'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status IN%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.inquiries DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END;
$$;

ALTER TABLE IF EXISTS inquiries
  DROP CONSTRAINT IF EXISTS chk_inquiries_type,
  DROP CONSTRAINT IF EXISTS chk_inquiries_desc_length,
  DROP CONSTRAINT IF EXISTS chk_inquiries_max_proposals,
  DROP CONSTRAINT IF EXISTS chk_inquiries_consent;

ALTER TABLE IF EXISTS inquiries
  ADD CONSTRAINT inquiries_status_check
    CHECK (status IN ('new', 'viewed', 'responded', 'archived', 'reported')),
  ADD CONSTRAINT chk_inquiries_type
    CHECK (inquiry_type IN ('directed', 'generic')),
  ADD CONSTRAINT chk_inquiries_desc_length
    CHECK (char_length(description) BETWEEN 20 AND 5000),
  ADD CONSTRAINT chk_inquiries_max_proposals
    CHECK (max_proposals IS NULL OR max_proposals IN (3, 5, 10)),
  ADD CONSTRAINT chk_inquiries_consent
    CHECK (buyer_consent_to_share = TRUE);

DROP TRIGGER IF EXISTS inquiries_updated_at ON inquiries;
CREATE TRIGGER inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_buyers_blocked_until ON buyers(blocked_until);
CREATE INDEX IF NOT EXISTS idx_inquiries_buyer ON inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_product ON inquiries(product_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_category ON inquiries(category_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_dedup ON inquiries(dedup_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_type_status ON inquiries(inquiry_type, status);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Buyers view own inquiries" ON inquiries;
CREATE POLICY "Buyers view own inquiries" ON inquiries FOR SELECT
  USING (buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid()));
