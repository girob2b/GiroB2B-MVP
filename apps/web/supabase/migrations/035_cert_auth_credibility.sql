-- Migration 035: Auth credibility levels + cert_a1_identities
--
-- Levels: 1 = email, 2 = google, 3 = cert_a1
-- credibility_level never decreases — GREATEST() on every login.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email'
    CONSTRAINT user_profiles_auth_provider_check
    CHECK (auth_provider IN ('email', 'google', 'cert_a1')),
  ADD COLUMN IF NOT EXISTS credibility_level SMALLINT NOT NULL DEFAULT 1
    CONSTRAINT user_profiles_credibility_level_check
    CHECK (credibility_level BETWEEN 1 AND 3);

COMMENT ON COLUMN user_profiles.auth_provider IS
  'Highest auth method ever used: email(1) | google(2) | cert_a1(3)';
COMMENT ON COLUMN user_profiles.credibility_level IS
  '1 = email only, 2 = google verified, 3 = ICP-Brasil certificate';

-- Backfill existing rows: Google identities → level 2
UPDATE user_profiles up
SET auth_provider = 'google', credibility_level = 2
WHERE credibility_level < 2
  AND EXISTS (
    SELECT 1 FROM auth.identities ai
    WHERE ai.user_id = up.id
      AND ai.provider = 'google'
  );

-- Table to store cert A1 identity <-> user binding
CREATE TABLE IF NOT EXISTS cert_a1_identities (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cnpj            TEXT        NOT NULL UNIQUE,
  company_name    TEXT,
  cert_subject    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cert_a1_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cert_a1_identities_self_select" ON cert_a1_identities
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cert_a1_identities_cnpj_idx ON cert_a1_identities(cnpj);

-- RPC: atualiza credibilidade sem nunca diminuir o nível.
CREATE OR REPLACE FUNCTION upsert_user_credibility(
  p_user_id   uuid,
  p_provider  text,
  p_new_level smallint
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_profiles
  SET
    credibility_level = GREATEST(credibility_level, p_new_level),
    auth_provider     = CASE
                          WHEN p_new_level > credibility_level THEN p_provider
                          ELSE auth_provider
                        END
  WHERE id = p_user_id;
END;
$$;
