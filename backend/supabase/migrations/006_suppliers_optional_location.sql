-- ============================================================
-- Migration 006: Tornar city e state opcionais em suppliers
--
-- Contexto: durante o onboarding simplificado (sem validação
-- de CNPJ em tempo real), city e state não estão disponíveis.
-- Serão preenchidos posteriormente via perfil da empresa ou
-- validação assíncrona do CNPJ.
--
-- Mudanças:
--   1. suppliers.city  → nullable (era NOT NULL)
--   2. suppliers.state → nullable e sem CHECK de 2 chars
--                        (era NOT NULL CHECK char_length = 2)
-- ============================================================

ALTER TABLE suppliers
  ALTER COLUMN city  DROP NOT NULL,
  ALTER COLUMN state DROP NOT NULL;

-- Remove o CHECK constraint de char_length do state
-- (o nome do constraint varia; usamos DROP CONSTRAINT IF EXISTS
--  com os nomes gerados pelo Postgres)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
    FROM pg_constraint
   WHERE conrelid = 'public.suppliers'::regclass
     AND contype  = 'c'
     AND pg_get_constraintdef(oid) LIKE '%char_length(state)%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE suppliers DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END;
$$;

-- Adiciona novo CHECK mais permissivo: estado deve ter 2 chars OU ser nulo/vazio
ALTER TABLE suppliers
  ADD CONSTRAINT suppliers_state_len
  CHECK (state IS NULL OR state = '' OR char_length(state) = 2);
