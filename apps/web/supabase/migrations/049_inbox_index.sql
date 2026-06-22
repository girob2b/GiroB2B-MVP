-- Migration 049: índice em demand_contacts.supplier_user_id para inbox do vendedor
--
-- Contexto (Run 3 — inboxes): listSentOffers() filtra demand_contacts por
-- supplier_user_id. O índice existente (idx_demand_contacts_supplier) usa
-- supplier_id (UUID do row em suppliers), não supplier_user_id (UUID do auth.users).
-- Sem este índice, a query "propostas enviadas" faz seq scan na tabela de contatos
-- a cada acesso ao inbox do vendedor.
--
-- Aplicação MANUAL via Supabase SQL Editor (não há staging; preview = prod).
-- URL: https://supabase.com/dashboard/project/kvxcdifargsjqjvusdfq/sql/new
--
-- Smoke SQL pós-aplicação:
--   SELECT indexname FROM pg_indexes
--   WHERE tablename = 'demand_contacts'
--     AND indexname = 'idx_demand_contacts_supplier_user_id';
--   -- Deve retornar 1 row.
--
-- Rollback (seguro — sem dados destruídos):
--   DROP INDEX IF EXISTS idx_demand_contacts_supplier_user_id;

CREATE INDEX IF NOT EXISTS idx_demand_contacts_supplier_user_id
  ON demand_contacts (supplier_user_id, clicked_at DESC);

COMMENT ON INDEX idx_demand_contacts_supplier_user_id IS
  'Suporta listSentOffers() — inbox "Propostas enviadas" do vendedor.
   Filtra por supplier_user_id (auth.uid()) e ordena por clicked_at DESC.
   Adicionado em migration 049 (2026-06-22).';
