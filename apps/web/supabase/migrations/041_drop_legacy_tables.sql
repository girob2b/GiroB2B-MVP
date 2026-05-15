-- Migration 041: drop tabelas legadas do modelo clássico.
--
-- Decisão de produto 2026-05-14: ao invés de esperar 60 dias de zero uso,
-- o Vitor confirmou drop agora. O pivot pra reverse marketplace tornou
-- essas tabelas obsoletas e mantê-las apenas adiciona ruído + custo de
-- backup.
--
-- Sequência respeita dependências (FKs):
--   1. RPCs e funções SECURITY DEFINER que referenciam essas tabelas.
--   2. Views derivadas.
--   3. Tabelas em ordem reversa de FK.

BEGIN;

-- Funções / RPCs legadas (silenciosas se não existirem).
DROP FUNCTION IF EXISTS create_directed_inquiry_tx(uuid, uuid, text, text, text, text);
DROP FUNCTION IF EXISTS create_directed_inquiry_tx(uuid, uuid, text, text, text, text, text);
DROP FUNCTION IF EXISTS create_directed_inquiry_tx(uuid, uuid, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS create_generic_inquiry_quote(uuid, text, text, text);
DROP FUNCTION IF EXISTS createGenericInquiryQuote(uuid, text, text, text);
DROP FUNCTION IF EXISTS move_proposal_pipeline_cards(uuid);

-- Views legadas.
DROP VIEW IF EXISTS search_needs_public;

-- Drop tabelas — CASCADE pra remover FKs/policies sem precisar listar uma a uma.
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS pipeline_cards CASCADE;
DROP TABLE IF EXISTS pipeline_columns CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS inquiry_rate_limits CASCADE;
DROP TABLE IF EXISTS inquiries CASCADE;
DROP TABLE IF EXISTS search_needs CASCADE;

COMMIT;
