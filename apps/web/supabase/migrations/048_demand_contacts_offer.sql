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

-- Remove a sobrecarga ANTIGA (5 args, vinda do baseline 036). A nova assinatura
-- abaixo tem os 5 primeiros params + 3 de oferta com DEFAULT NULL; manter as duas
-- criaria ambiguidade de overload (chamada de 3-5 args bate nas duas → 42725
-- "function is not unique", inclusive no COMMENT por nome). Com o DROP, fica só a nova.
DROP FUNCTION IF EXISTS register_demand_contact(UUID, UUID, UUID, TEXT, TEXT);

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
