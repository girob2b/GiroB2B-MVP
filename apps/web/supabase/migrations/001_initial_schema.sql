-- ============================================================
-- GiroB2B — Schema Inicial (MVP)
-- Executar no SQL Editor do Supabase
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

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

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug   ON categories(slug);

-- ============================================================
-- PERFIS DE USUÁRIO (estende auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'supplier', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: criar perfil automaticamente ao criar usuário no Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'));
  RETURN NEW;
END;
$$;

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

CREATE INDEX idx_suppliers_city       ON suppliers(city);
CREATE INDEX idx_suppliers_state      ON suppliers(state);
CREATE INDEX idx_suppliers_plan       ON suppliers(plan);
CREATE INDEX idx_suppliers_slug       ON suppliers(slug);
CREATE INDEX idx_suppliers_categories ON suppliers USING GIN(categories);
CREATE INDEX idx_suppliers_fts        ON suppliers USING GIN(
  to_tsvector('portuguese'::regconfig, trade_name || ' ' || COALESCE(description, '') || ' ' || city || ' ' || state)
);

-- Trigger: atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

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

CREATE UNIQUE INDEX idx_products_global_slug ON products(slug) WHERE status != 'deleted';
CREATE INDEX idx_products_category   ON products(category_id);
CREATE INDEX idx_products_supplier   ON products(supplier_id);
CREATE INDEX idx_products_status     ON products(status);
CREATE INDEX idx_products_fts        ON products USING GIN(
  to_tsvector('portuguese'::regconfig, name || ' ' || COALESCE(description, ''))
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- COMPRADORES
-- ============================================================
CREATE TABLE IF NOT EXISTS buyers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  company         TEXT,
  city            TEXT,
  state           TEXT,
  lgpd_consent    BOOLEAN NOT NULL DEFAULT FALSE,
  lgpd_consent_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_buyers_email ON buyers(email);

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

CREATE INDEX idx_inquiries_supplier   ON inquiries(supplier_id);
CREATE INDEX idx_inquiries_status     ON inquiries(status);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at DESC);

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

-- user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active suppliers"   ON suppliers FOR SELECT USING (suspended = FALSE);
CREATE POLICY "Suppliers manage own profile"        ON suppliers FOR ALL    USING (auth.uid() = user_id);

-- products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active products"     ON products FOR SELECT USING (status = 'active');
CREATE POLICY "Suppliers manage own products"       ON products FOR ALL
  USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active categories"   ON categories FOR SELECT USING (active = TRUE);
CREATE POLICY "Admins manage categories"            ON categories FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- buyers
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers view own data"                ON buyers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Buyers manage own data"              ON buyers FOR ALL USING (auth.uid() = user_id);

-- inquiries
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suppliers view own inquiries"        ON inquiries FOR SELECT
  USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));
CREATE POLICY "Suppliers update own inquiries"      ON inquiries FOR UPDATE
  USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));
-- INSERT é feito via service_role (API Route) para validar rate limit server-side

-- ============================================================
-- STORAGE BUCKETS (executar no Supabase Dashboard > Storage)
-- ============================================================
-- bucket: supplier-logos    (public: true,  max: 2MB)
-- bucket: supplier-photos   (public: true,  max: 5MB)
-- bucket: product-images    (public: true,  max: 5MB)
