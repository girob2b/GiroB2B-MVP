-- Migration 051: demand_contacts — condições de pagamento aceitas pelo vendedor
--
-- Contexto (Fase 1 do comparador de cotações, branch feat/enviar-cotacao):
-- Ao enviar uma cotação, o vendedor pode indicar quais condições de pagamento aceita
-- (ex: pix, boleto, parcelado). Campo categórico — não entra no score ponderado do
-- comparador; serve como filtro/match na Fase 2. Campo nullable, retrocompatível.
--
-- Valores canônicos (espelham OfferPaymentMethod em lib/schemas/leads.ts):
--   a_vista | pix | boleto | cartao | parcelado | faturado_30d
--
-- Aplicação MANUAL via Supabase Management API / SQL Editor (não há staging;
-- preview da Vercel = banco de prod). Idempotente. Rollback comentado ao final.
--
-- Smoke SQL pós-aplicação:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'demand_contacts'
--     AND column_name = 'offer_payment_methods';
--   -- Deve retornar 1 row.
--
--   -- Teste do CHECK: deve falhar com valor inválido:
--   -- UPDATE demand_contacts SET offer_payment_methods = ARRAY['invalido'] WHERE FALSE;

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Coluna offer_payment_methods em demand_contacts
--
--    TEXT[] nullable — retrocompatível com contatos e ofertas sem este campo.
--    CHECK duplo:
--      - valores: só os 6 canônicos aceitos (array <@ conjunto permitido).
--      - cardinalidade: máx 6 elementos (impossível ter mais que os 6 canônicos,
--        mas torna a regra explícita no banco).
-- ─────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Atualiza RPC register_demand_contact — novo param p_offer_payment_methods
--
--    CREATE OR REPLACE não permite alterar a lista de parâmetros — DROP necessário.
--    O DROP da assinatura antiga (8 params, da migration 048) é seguro:
--      - única chamada é via adminClient (service_role) em lib/services/demands.ts
--      - o novo param tem DEFAULT NULL → retrocompatível: callers sem o param funcionam.
--    Mesma postura de segurança: REVOKE ALL FROM PUBLIC + só service_role executa.
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove assinatura de 8 parâmetros (migration 048) para evitar overload ambíguo.
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
-- Chamado exclusivamente via adminClient (service_role) — nunca exposto ao client anon/authenticated.

COMMENT ON FUNCTION register_demand_contact IS
  'Registra contato (click em "Enviar cotação" ou "Contatar via WhatsApp") e incrementa
   contact_count atomicamente. Aceita campos opcionais de oferta:
     price_cents, deadline, message (desde migration 048)
     payment_methods TEXT[] (desde migration 051)
   SECURITY DEFINER — executado como owner do schema. Chamado exclusivamente via adminClient
   (service_role) em lib/services/demands.ts > registerContact(). Nunca exposto ao cliente.
   Atualizado em migration 051 (2026-06-27): +offer_payment_methods.';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (executar manualmente se precisar reverter):
--
-- BEGIN;
-- DROP FUNCTION IF EXISTS register_demand_contact(UUID, UUID, UUID, TEXT, TEXT, BIGINT, DATE, TEXT, TEXT[]);
-- -- Recriar assinatura da migration 048 (8 params, sem payment_methods):
-- CREATE OR REPLACE FUNCTION register_demand_contact(
--   p_demand_id         UUID,
--   p_supplier_id       UUID,
--   p_supplier_user_id  UUID,
--   p_ip                TEXT   DEFAULT NULL,
--   p_user_agent        TEXT   DEFAULT NULL,
--   p_offer_price_cents BIGINT DEFAULT NULL,
--   p_offer_deadline    DATE   DEFAULT NULL,
--   p_offer_message     TEXT   DEFAULT NULL
-- ) RETURNS UUID
-- LANGUAGE plpgsql SECURITY DEFINER AS $$
-- DECLARE v_id UUID;
-- BEGIN
--   INSERT INTO demand_contacts (
--     demand_id, supplier_id, supplier_user_id, ip, user_agent,
--     offer_price_cents, offer_deadline, offer_message
--   )
--   VALUES (
--     p_demand_id, p_supplier_id, p_supplier_user_id, p_ip, p_user_agent,
--     p_offer_price_cents, p_offer_deadline, p_offer_message
--   )
--   RETURNING id INTO v_id;
--   UPDATE demands SET contact_count = contact_count + 1 WHERE id = p_demand_id;
--   RETURN v_id;
-- END; $$;
-- REVOKE ALL ON FUNCTION register_demand_contact(UUID, UUID, UUID, TEXT, TEXT, BIGINT, DATE, TEXT) FROM PUBLIC;
-- ALTER TABLE demand_contacts DROP COLUMN IF EXISTS offer_payment_methods;
-- COMMIT;
-- ─────────────────────────────────────────────────────────────────────────────
