-- Waitlist unificada: uma linha por inscrito, separada por role
-- role = 'supplier' → campos do WaitlistModal (email, cnpj, category, ...)
-- role = 'enterprise' → campos do EnterpriseModal (name, company, estimated_volume, message)

CREATE TABLE IF NOT EXISTS public.waitlist (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role              TEXT        NOT NULL CHECK (role IN ('supplier', 'enterprise')),

  -- campos comuns
  email             TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- campos supplier (WaitlistModal)
  cnpj              TEXT,
  category          TEXT,
  consent_marketing BOOLEAN,
  source            TEXT,
  utm_source        TEXT,
  utm_medium        TEXT,
  utm_campaign      TEXT,
  user_agent        TEXT,

  -- campos enterprise (EnterpriseModal)
  name              TEXT,
  company           TEXT,
  estimated_volume  TEXT,
  message           TEXT
);

-- dedup: supplier → email+cnpj, enterprise → só email
CREATE UNIQUE INDEX waitlist_supplier_dedup
  ON public.waitlist (email, cnpj)
  WHERE role = 'supplier';

CREATE UNIQUE INDEX waitlist_enterprise_dedup
  ON public.waitlist (email)
  WHERE role = 'enterprise';

-- índice para listagem admin ordenada por data
CREATE INDEX waitlist_created_at_idx
  ON public.waitlist (created_at DESC);

-- RLS: visitante anônimo só pode inserir, nunca ler
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_anon_insert"
  ON public.waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- SELECT/UPDATE/DELETE: somente service_role (admin client, sem policy = bloqueado para anon/authenticated)

-- rollback: DROP TABLE IF EXISTS public.waitlist;
