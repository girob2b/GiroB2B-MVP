-- Migration 043: waitlist.role aceita 'buyer'.
--
-- Decisão 2026-05-14: novo campo "Quero entrar como" na landing aceita
-- Comprador. CHECK constraint original só permitia supplier/enterprise.

BEGIN;

ALTER TABLE waitlist DROP CONSTRAINT IF EXISTS waitlist_role_check;
ALTER TABLE waitlist ADD CONSTRAINT waitlist_role_check
  CHECK (role = ANY (ARRAY['buyer'::text, 'supplier'::text, 'enterprise'::text]));

COMMIT;
