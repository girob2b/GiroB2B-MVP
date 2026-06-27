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

-- ─── Migration 046: supplier feed tracking ────────────────────────────────────
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS last_feed_view_at TIMESTAMPTZ;

COMMENT ON COLUMN suppliers.last_feed_view_at IS
  'Timestamp da última vez que o supplier carregou o feed /painel/leads.
   Usado para calcular "N demandas novas desde sua última visita".
   NULL = nunca visitou. Atualizado via POST /api/supplier/feed-view.';

CREATE INDEX IF NOT EXISTS idx_demands_created_open
  ON demands (created_at DESC)
  WHERE status = 'open' AND expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_demand_contacts_supplier_demand
  ON demand_contacts (supplier_id, demand_id);
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


-- ============================================================
-- Migration 048: demand_contacts offer fields + RPC update
-- (Bloco 4 Headline — proposta híbrida, 2026-06-22)
-- ============================================================

-- Migration 048: demand_contacts — campos de oferta híbrida (Bloco 4 Headline)
--
-- Contexto: vendedor pode preencher preço/prazo/mensagem antes de abrir WhatsApp.
-- Esses campos são opcionais e enriquecem a mensagem do WhatsApp (proposta híbrida).
-- Não cria proposta on-platform — a oferta termina no WhatsApp. Respeita o pivot.
--
-- Aplicação MANUAL via Supabase SQL Editor (não há staging; preview = prod).
-- URL: https://supabase.com/dashboard/project/kvxcdifargsjqjvusdfq/sql/new
--
-- Smoke SQL pós-aplicação:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'demand_contacts'
--     AND column_name IN ('offer_price_cents', 'offer_deadline', 'offer_message');
--   -- Deve retornar 3 rows.
--
-- Rollback (seguro — sem dados destruídos, colunas nullable):
--   ALTER TABLE demand_contacts
--     DROP COLUMN IF EXISTS offer_price_cents,
--     DROP COLUMN IF EXISTS offer_deadline,
--     DROP COLUMN IF EXISTS offer_message;

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Colunas de oferta em demand_contacts
--
--    Todas nullable — retrocompatível com contatos sem oferta.
--    offer_price_cents: preço em centavos inteiros (evita float, alinhado ao Zod).
--    offer_deadline: data de entrega prometida pelo vendedor.
--    offer_message: mensagem curta personalizada (máx 300 chars — CHECK).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE demand_contacts
  ADD COLUMN IF NOT EXISTS offer_price_cents BIGINT,
  ADD COLUMN IF NOT EXISTS offer_deadline    DATE,
  ADD COLUMN IF NOT EXISTS offer_message     TEXT
    CONSTRAINT chk_offer_message_length CHECK (
      offer_message IS NULL OR length(offer_message) <= 300
    );

COMMENT ON COLUMN demand_contacts.offer_price_cents IS
  'Preço oferecido pelo supplier em centavos inteiros. NULL = sem preço informado.
   Gerado a partir de OfferInput.price (lib/schemas/leads.ts) validado no Server Action.';

COMMENT ON COLUMN demand_contacts.offer_deadline IS
  'Prazo de entrega prometido pelo supplier. NULL = sem prazo informado.
   Gerado a partir de OfferInput.deadline (YYYY-MM-DD).';

COMMENT ON COLUMN demand_contacts.offer_message IS
  'Mensagem personalizada curta do supplier (máx 300 chars). NULL = sem mensagem.
   Gerado a partir de OfferInput.message. Inclusa no texto do WhatsApp.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Atualiza RPC register_demand_contact para aceitar os novos campos
--
--    Parâmetros novos têm DEFAULT NULL — chamadas sem eles continuam funcionando
--    (retrocompatível com qualquer caller que não passe os novos params).
--    SECURITY DEFINER + REVOKE ALL FROM PUBLIC: sem mudança de postura de segurança.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION register_demand_contact(
  p_demand_id         UUID,
  p_supplier_id       UUID,
  p_supplier_user_id  UUID,
  p_ip                TEXT   DEFAULT NULL,
  p_user_agent        TEXT   DEFAULT NULL,
  p_offer_price_cents BIGINT DEFAULT NULL,
  p_offer_deadline    DATE   DEFAULT NULL,
  p_offer_message     TEXT   DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO demand_contacts (
    demand_id,
    supplier_id,
    supplier_user_id,
    ip,
    user_agent,
    offer_price_cents,
    offer_deadline,
    offer_message
  )
  VALUES (
    p_demand_id,
    p_supplier_id,
    p_supplier_user_id,
    p_ip,
    p_user_agent,
    p_offer_price_cents,
    p_offer_deadline,
    p_offer_message
  )
  RETURNING id INTO v_id;

  UPDATE demands SET contact_count = contact_count + 1 WHERE id = p_demand_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION register_demand_contact(UUID, UUID, UUID, TEXT, TEXT, BIGINT, DATE, TEXT) FROM PUBLIC;
-- Server Action chama via service_role (adminClient); não exposto ao client.

COMMENT ON FUNCTION register_demand_contact IS
  'Registra contato (click em "Contatar via WhatsApp") e incrementa contact_count atomicamente.
   Aceita campos opcionais de oferta híbrida (Bloco 4 Headline): price_cents, deadline, message.
   SECURITY DEFINER — executado como owner do schema. Chamado exclusivamente via adminClient.
   Atualizado em migration 048 (2026-06-22): +offer_price_cents, +offer_deadline, +offer_message.';

COMMIT;

-- ============================================================
-- Migration 049: índice em demand_contacts.supplier_user_id
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_demand_contacts_supplier_user_id
  ON demand_contacts (supplier_user_id, clicked_at DESC);

COMMENT ON INDEX idx_demand_contacts_supplier_user_id IS
  'Suporta listSentOffers() — inbox "Propostas enviadas" do vendedor.
   Filtra por supplier_user_id (auth.uid()) e ordena por clicked_at DESC.
   Adicionado em migration 049 (2026-06-22).';


-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 050: buyers public profile opt-in (LGPD-safe)
-- ═══════════════════════════════════════════════════════════════════════════

-- Migration 050: perfil público de empresa COMPRADORA por OPT-IN (LGPD-safe)
--
-- Decisão (2026-06-22): na home, abaixo do feed de demandas, exibir perfis de
-- empresas COMPRADORAS — mas só as que (a) têm identidade de empresa real E
-- (b) marcaram opt-in explícito ("quero aparecer como empresa pública").
-- Isso resolve a LGPD: consentimento explícito de exposição pública, sem
-- de-anonimizar todo comprador.
--
-- O "catálogo" da empresa compradora = perfil dela + demandas abertas dela
-- (comprador não tem catálogo de produtos — espelha /fornecedor/[slug]).
--
-- REGRA DURA (LGPD):
--   - Superfície pública expõe SÓ linhas opted-in (public_profile_opt_in=true).
--   - SÓ campos não-PII: company_name, setor, cidade, UF, member_since, slug.
--   - NUNCA email/telefone/whatsapp/cnpj/endereço/CEP/qualquer contato.
--   - Default opt-in = false (privacidade por padrão).
--
-- ELEGIBILIDADE (caveat BrasilAPI):
--   BrasilAPI está DESLIGADA no MVP → buyers.is_company_verified é quase sempre
--   FALSE (só vira TRUE com validação externa de CNPJ, que não roda). Por isso o
--   critério PRÁTICO de "identidade de empresa real" NÃO depende de
--   is_company_verified: é (cnpj preenchido E company_name preenchido). Quando
--   is_company_verified estiver disponível (BrasilAPI reativada), ele REFORÇA o
--   critério mas não é obrigatório. Consequência esperada: a seção fica VAZIA
--   até compradores preencherem CNPJ + razão social E ligarem o opt-in.
--
-- Aplicação MANUAL via Supabase Management API / SQL Editor (não há staging;
-- preview da Vercel = banco de prod). Idempotente. Rollback comentado ao final.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Helper de slugify: unaccent imutável (ASCII translit pt-BR).
--    Definido ANTES de ser usado no backfill (seção 2) e na RPC (seção 4).
--    Própria (não depende da extensão unaccent) e IMMUTABLE → pode ir em índice.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION unaccent_immutable(txt TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT translate(
    txt,
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Colunas de opt-in + consent versionado + slug em buyers
--
--    Espelha o padrão de consent versionado de demands
--    (lgpd_consent / lgpd_consent_at / lgpd_consent_text_version, migration 036).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS public_profile_opt_in              BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_profile_consent_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_profile_consent_text_version TEXT,
  ADD COLUMN IF NOT EXISTS slug                                TEXT;

COMMENT ON COLUMN public.buyers.public_profile_opt_in IS
  'TRUE quando o comprador consentiu EXPLICITAMENTE em aparecer como empresa pública (home + /empresa/[slug]). Default FALSE (privacidade por padrão). Só o próprio buyer autenticado liga, e só com cnpj+company_name preenchidos. LGPD: este é o consentimento de exposição pública.';
COMMENT ON COLUMN public.buyers.public_profile_consent_at IS
  'Timestamp do consentimento de exposição pública. NULL enquanto opt-in nunca foi ligado.';
COMMENT ON COLUMN public.buyers.public_profile_consent_text_version IS
  'Versão do texto de consentimento aceito (ex: buyer-public-profile-v1-2026-06-22). Espelha demands.lgpd_consent_text_version. Auditável.';
COMMENT ON COLUMN public.buyers.slug IS
  'Slug público único do comprador, gerado a partir de company_name. Usado em /empresa/[slug]. NULL para buyers sem company_name.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill de slug a partir de company_name (idempotente, único)
--
--    Gera slug só pra quem tem company_name e ainda não tem slug.
--    Colisão resolvida com sufixo numérico determinístico por row_number.
-- ─────────────────────────────────────────────────────────────────────────────

WITH base AS (
  SELECT
    id,
    -- slugify pt-BR: minúsculas, sem acento, só [a-z0-9-], colapsa hífens.
    regexp_replace(
      regexp_replace(
        lower(unaccent_immutable(company_name)),
        '[^a-z0-9]+', '-', 'g'
      ),
      '(^-+|-+$)', '', 'g'
    ) AS raw_slug
  FROM public.buyers
  WHERE slug IS NULL
    AND company_name IS NOT NULL
    AND company_name <> ''
),
numbered AS (
  SELECT
    id,
    CASE WHEN raw_slug = '' THEN 'empresa' ELSE left(raw_slug, 72) END AS base_slug,
    row_number() OVER (
      PARTITION BY CASE WHEN raw_slug = '' THEN 'empresa' ELSE left(raw_slug, 72) END
      ORDER BY id
    ) AS rn
  FROM base
)
UPDATE public.buyers b
SET slug = CASE WHEN n.rn = 1 THEN n.base_slug ELSE n.base_slug || '-' || n.rn END
FROM numbered n
WHERE b.id = n.id
  AND NOT EXISTS (
    -- defensivo: não colide com slug já existente fora do batch
    SELECT 1 FROM public.buyers x
    WHERE x.id <> b.id
      AND x.slug = (CASE WHEN n.rn = 1 THEN n.base_slug ELSE n.base_slug || '-' || n.rn END)
  );

-- Índice único parcial: slug é único quando presente; permite múltiplos NULL.
CREATE UNIQUE INDEX IF NOT EXISTS idx_buyers_slug_unique
  ON public.buyers (slug)
  WHERE slug IS NOT NULL;

-- Índice de apoio à elegibilidade pública (filtra opted-in rapidamente).
CREATE INDEX IF NOT EXISTS idx_buyers_public_opt_in
  ON public.buyers (public_profile_opt_in)
  WHERE public_profile_opt_in = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. View buyers_public — espelha demands_public.
--
--    Expõe SÓ campos não-PII de compradores ELEGÍVEIS:
--      company_name, sector_slugs, city, state, logo_url(*), open_demands_count,
--      member_since (created_at), slug, is_company_verified.
--    (*) buyers ainda não tem logo_url; expomos NULL como placeholder estável
--        no contrato — quando a coluna existir, basta trocar a expressão.
--
--    Elegibilidade (WHERE):
--      public_profile_opt_in = TRUE
--      AND cnpj preenchido AND company_name preenchido  (identidade real)
--      AND slug IS NOT NULL                             (tem URL pública)
--
--    NUNCA expõe: email, phone, cnpj, address, cep, whatsapp.
--    open_demands_count = nº de demandas abertas e não expiradas do buyer
--    (equivale ao WHERE de demands_public).
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS buyers_public;

CREATE VIEW buyers_public AS
SELECT
  b.slug,
  b.company_name,
  b.segments        AS sector_slugs,   -- category slugs de interesse (não-PII)
  b.city,
  b.state,
  NULL::text        AS logo_url,       -- placeholder: buyers ainda não tem logo
  b.is_company_verified,
  b.created_at      AS member_since,
  COALESCE(d.open_demands_count, 0) AS open_demands_count
FROM public.buyers b
LEFT JOIN LATERAL (
  SELECT count(*) AS open_demands_count
  FROM public.demands dd
  WHERE dd.buyer_user_id = b.user_id
    AND dd.status = 'open'
    AND dd.expires_at > NOW()
) d ON TRUE
WHERE b.public_profile_opt_in = TRUE
  AND b.slug IS NOT NULL
  -- Identidade de empresa real (BrasilAPI off → não exige is_company_verified).
  AND b.cnpj IS NOT NULL AND b.cnpj <> ''
  AND b.company_name IS NOT NULL AND b.company_name <> '';

GRANT SELECT ON buyers_public TO anon, authenticated;

COMMENT ON VIEW buyers_public IS
  'Vitrine pública de empresas COMPRADORAS opted-in (LGPD-safe). Espelha demands_public.
   Expõe SÓ não-PII: company_name, sector_slugs, city, state, logo_url(placeholder NULL),
   is_company_verified, member_since, open_demands_count, slug.
   NUNCA email/phone/cnpj/address/cep/whatsapp.
   WHERE: public_profile_opt_in=TRUE AND cnpj+company_name preenchidos AND slug presente.
   BrasilAPI off → is_company_verified é só reforço, não requisito → seção fica vazia
   até compradores preencherem CNPJ+razão social e ligarem o opt-in (esperado).
   Criada em migration 050 (2026-06-22).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC set_buyer_public_profile_opt_in — liga/desliga o opt-in com consent.
--
--    SECURITY DEFINER: grava em buyers (RLS only-own) garantindo que o caller
--    é o próprio dono (auth.uid() = buyers.user_id). Quando opt_in=TRUE, exige
--    cnpj + company_name preenchidos e grava consent_at + consent_text_version.
--    Também gera o slug on-demand se ainda não existir.
--
--    GRANT EXECUTE só para authenticated (cada um age sobre a própria linha via
--    auth.uid()) — segue o padrão de RPCs que tocam só o próprio dado.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_buyer_public_profile_opt_in(
  p_opt_in BOOLEAN,
  p_consent_text_version TEXT DEFAULT NULL
) RETURNS TABLE (slug TEXT, opt_in BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_buyer     RECORD;
  v_slug      TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '28000';
  END IF;

  SELECT b.id, b.cnpj, b.company_name, b.slug
    INTO v_buyer
  FROM public.buyers b
  WHERE b.user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'buyer profile not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_opt_in THEN
    -- Identidade de empresa real exigida pra ligar (BrasilAPI off → não exige
    -- is_company_verified; cnpj+company_name bastam).
    IF v_buyer.cnpj IS NULL OR v_buyer.cnpj = ''
       OR v_buyer.company_name IS NULL OR v_buyer.company_name = '' THEN
      RAISE EXCEPTION 'cnpj and company_name required to opt in'
        USING ERRCODE = 'P0001';
    END IF;

    -- Garante slug (gera se faltar).
    v_slug := v_buyer.slug;
    IF v_slug IS NULL THEN
      v_slug := regexp_replace(
        regexp_replace(lower(unaccent_immutable(v_buyer.company_name)), '[^a-z0-9]+', '-', 'g'),
        '(^-+|-+$)', '', 'g'
      );
      IF v_slug = '' THEN v_slug := 'empresa'; END IF;
      v_slug := left(v_slug, 72);
      -- Resolve colisão com sufixo incremental.
      WHILE EXISTS (SELECT 1 FROM public.buyers WHERE slug = v_slug AND user_id <> v_user_id) LOOP
        v_slug := left(v_slug, 68) || '-' || floor(random() * 9000 + 1000)::int;
      END LOOP;
    END IF;

    UPDATE public.buyers
    SET public_profile_opt_in = TRUE,
        public_profile_consent_at = NOW(),
        public_profile_consent_text_version = COALESCE(p_consent_text_version, public_profile_consent_text_version),
        slug = v_slug
    WHERE user_id = v_user_id;

    RETURN QUERY SELECT v_slug, TRUE;
  ELSE
    -- Desligar: mantém slug e consent histórico (auditável), só vira o flag.
    UPDATE public.buyers
    SET public_profile_opt_in = FALSE
    WHERE user_id = v_user_id;

    RETURN QUERY SELECT v_buyer.slug, FALSE;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION set_buyer_public_profile_opt_in(BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_buyer_public_profile_opt_in(BOOLEAN, TEXT) TO authenticated;

COMMENT ON FUNCTION set_buyer_public_profile_opt_in IS
  'Liga/desliga o opt-in de perfil público do buyer autenticado (auth.uid()).
   opt_in=TRUE exige cnpj+company_name, grava consent_at + consent_text_version, gera slug.
   opt_in=FALSE só desliga o flag (mantém slug e consent histórico, auditável).
   SECURITY DEFINER, GRANT EXECUTE só authenticated — age sobre a própria linha.
   Migration 050 (2026-06-22).';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (executar manualmente se precisar reverter):
--
-- DROP VIEW IF EXISTS buyers_public;
-- DROP FUNCTION IF EXISTS set_buyer_public_profile_opt_in(BOOLEAN, TEXT);
-- DROP INDEX IF EXISTS idx_buyers_slug_unique;
-- DROP INDEX IF EXISTS idx_buyers_public_opt_in;
-- ALTER TABLE public.buyers
--   DROP COLUMN IF EXISTS public_profile_opt_in,
--   DROP COLUMN IF EXISTS public_profile_consent_at,
--   DROP COLUMN IF EXISTS public_profile_consent_text_version,
--   DROP COLUMN IF EXISTS slug;
-- -- (unaccent_immutable pode ser mantida; é inócua e reutilizável.)
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================
-- Migration 051 — demand_contacts: condições de pagamento aceitas pelo vendedor
-- ============================================================

-- Migration 051: demand_contacts — condições de pagamento aceitas pelo vendedor
--
-- Contexto (Fase 1 do comparador de cotações, branch feat/enviar-cotacao):
-- Ao enviar uma cotação, o vendedor pode indicar quais condições de pagamento aceita
-- (ex: pix, boleto, parcelado). Campo categórico — não entra no score ponderado do
-- comparador; serve como filtro/match na Fase 2. Campo nullable, retrocompatível.
--
-- Valores canônicos (espelham OfferPaymentMethod em lib/schemas/leads.ts):
--   a_vista | pix | boleto | cartao | parcelado | faturado_30d

BEGIN;

ALTER TABLE demand_contacts
  ADD COLUMN IF NOT EXISTS offer_payment_methods TEXT[]
    CONSTRAINT chk_offer_payment_methods_values CHECK (
      offer_payment_methods IS NULL
      OR offer_payment_methods <@ ARRAY['a_vista','pix','boleto','cartao','parcelado','faturado_30d']::TEXT[]
    )
    CONSTRAINT chk_offer_payment_methods_length CHECK (
      offer_payment_methods IS NULL OR cardinality(offer_payment_methods) <= 6
    );

COMMENT ON COLUMN demand_contacts.offer_payment_methods IS
  'Condições de pagamento que o supplier aceita para esta oferta (TEXT[], nullable).
   Valores canônicos: a_vista | pix | boleto | cartao | parcelado | faturado_30d.
   NULL = supplier não informou condições de pagamento (retrocompatível).
   Categórico — não entra no score ponderado do comparador; serve como filtro/match (Fase 2).
   Gerado a partir de OfferInput.payment_methods (lib/schemas/leads.ts).
   Adicionado em migration 051 (2026-06-27).';

DROP FUNCTION IF EXISTS register_demand_contact(UUID, UUID, UUID, TEXT, TEXT, BIGINT, DATE, TEXT);

CREATE OR REPLACE FUNCTION register_demand_contact(
  p_demand_id             UUID,
  p_supplier_id           UUID,
  p_supplier_user_id      UUID,
  p_ip                    TEXT     DEFAULT NULL,
  p_user_agent            TEXT     DEFAULT NULL,
  p_offer_price_cents     BIGINT   DEFAULT NULL,
  p_offer_deadline        DATE     DEFAULT NULL,
  p_offer_message         TEXT     DEFAULT NULL,
  p_offer_payment_methods TEXT[]   DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO demand_contacts (
    demand_id,
    supplier_id,
    supplier_user_id,
    ip,
    user_agent,
    offer_price_cents,
    offer_deadline,
    offer_message,
    offer_payment_methods
  )
  VALUES (
    p_demand_id,
    p_supplier_id,
    p_supplier_user_id,
    p_ip,
    p_user_agent,
    p_offer_price_cents,
    p_offer_deadline,
    p_offer_message,
    p_offer_payment_methods
  )
  RETURNING id INTO v_id;

  UPDATE demands SET contact_count = contact_count + 1 WHERE id = p_demand_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION register_demand_contact(UUID, UUID, UUID, TEXT, TEXT, BIGINT, DATE, TEXT, TEXT[]) FROM PUBLIC;

COMMENT ON FUNCTION register_demand_contact IS
  'Registra contato e incrementa contact_count atomicamente. Aceita campos de oferta:
   price_cents, deadline, message (migration 048) e payment_methods TEXT[] (migration 051).
   SECURITY DEFINER. Chamado exclusivamente via adminClient (service_role).
   Atualizado em migration 051 (2026-06-27): +offer_payment_methods.';

COMMIT;
