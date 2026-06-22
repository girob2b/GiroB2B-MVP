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
