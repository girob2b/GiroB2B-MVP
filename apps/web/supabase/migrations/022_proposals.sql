-- 022_proposals.sql
-- Sistema de propostas formais: comprador envia, fornecedor aceita/recusa,
-- pipeline bilateral atualizado automaticamente via SECURITY DEFINER.

-- ── proposals ─────────────────────────────────────────────────────────────────

CREATE TABLE proposals (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id            UUID        NOT NULL REFERENCES buyers(id)       ON DELETE CASCADE,
  supplier_id         UUID        NOT NULL REFERENCES suppliers(id)    ON DELETE CASCADE,
  conversation_id     UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  product_id          UUID                 REFERENCES products(id)     ON DELETE SET NULL,
  product_name        TEXT        NOT NULL,
  quantity            INTEGER     NOT NULL CHECK (quantity > 0),
  unit                TEXT,
  target_price_cents  INTEGER     CHECK (target_price_cents > 0),
  max_budget_cents    INTEGER     CHECK (max_budget_cents > 0),
  delivery_deadline   DATE,
  payment_terms       TEXT,
  notes               TEXT,
  status              TEXT        NOT NULL DEFAULT 'sent'
                        CHECK (status IN ('draft','sent','accepted','refused',
                                          'revised','cancelled','shipped','completed')),
  refusal_reason      TEXT,
  parent_id           UUID        REFERENCES proposals(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposals_buyer        ON proposals(buyer_id);
CREATE INDEX idx_proposals_supplier     ON proposals(supplier_id);
CREATE INDEX idx_proposals_conversation ON proposals(conversation_id);
CREATE INDEX idx_proposals_status       ON proposals(status);

-- ── Extend pipeline_cards ─────────────────────────────────────────────────────

ALTER TABLE pipeline_cards
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin      TEXT NOT NULL DEFAULT 'manual'
                             CHECK (origin IN ('manual', 'auto'));

-- ── Extend chat_messages: allow proposal_ref type ─────────────────────────────

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_message_type_check
  CHECK (message_type IN ('text','inquiry_ref','product_ref','system','proposal_ref'));

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_can_insert_proposal" ON proposals
  FOR INSERT WITH CHECK (
    buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
  );

CREATE POLICY "proposal_participants_select" ON proposals
  FOR SELECT USING (
    buyer_id    IN (SELECT id FROM buyers    WHERE user_id = auth.uid())
    OR
    supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
  );

CREATE POLICY "proposal_participants_update" ON proposals
  FOR UPDATE USING (
    buyer_id    IN (SELECT id FROM buyers    WHERE user_id = auth.uid())
    OR
    supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
  );

-- ── SECURITY DEFINER: cria cards no pipeline de ambas as partes ───────────────

CREATE OR REPLACE FUNCTION create_proposal_pipeline_cards(
  p_proposal_id      UUID,
  p_buyer_user_id    UUID,
  p_supplier_user_id UUID,
  p_product_name     TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_col_id    UUID;
  v_supplier_col_id UUID;
  v_pos             INT;
BEGIN
  -- ── Buyer: coluna "Proposta enviada" ──────────────────────────────────────
  SELECT id INTO v_buyer_col_id FROM pipeline_columns
  WHERE user_id = p_buyer_user_id AND title = 'Proposta enviada' LIMIT 1;

  IF v_buyer_col_id IS NULL THEN
    SELECT id INTO v_buyer_col_id FROM pipeline_columns
    WHERE user_id = p_buyer_user_id ORDER BY position LIMIT 1;
  END IF;

  IF v_buyer_col_id IS NULL THEN
    INSERT INTO pipeline_columns (user_id, title, position, color) VALUES
      (p_buyer_user_id, 'Descoberta',       0, 'blue'),
      (p_buyer_user_id, 'Proposta enviada', 1, 'amber'),
      (p_buyer_user_id, 'Aceita',           2, 'green'),
      (p_buyer_user_id, 'Em andamento',     3, 'blue'),
      (p_buyer_user_id, 'Concluído',        4, 'green'),
      (p_buyer_user_id, 'Recusada',         5, 'red');
    SELECT id INTO v_buyer_col_id FROM pipeline_columns
    WHERE user_id = p_buyer_user_id AND title = 'Proposta enviada';
  END IF;

  SELECT COUNT(*) INTO v_pos FROM pipeline_cards
  WHERE column_id = v_buyer_col_id AND user_id = p_buyer_user_id;

  INSERT INTO pipeline_cards (column_id, user_id, title, proposal_id, origin, position)
  VALUES (v_buyer_col_id, p_buyer_user_id, p_product_name, p_proposal_id, 'auto', v_pos);

  -- ── Supplier: coluna "Entrada" ────────────────────────────────────────────
  SELECT id INTO v_supplier_col_id FROM pipeline_columns
  WHERE user_id = p_supplier_user_id AND title = 'Entrada' LIMIT 1;

  IF v_supplier_col_id IS NULL THEN
    -- fallback: primeira coluna existente
    SELECT id INTO v_supplier_col_id FROM pipeline_columns
    WHERE user_id = p_supplier_user_id ORDER BY position LIMIT 1;
  END IF;

  IF v_supplier_col_id IS NULL THEN
    INSERT INTO pipeline_columns (user_id, title, position, color) VALUES
      (p_supplier_user_id, 'Entrada',          0, 'blue'),
      (p_supplier_user_id, 'Em conversa',       1, 'amber'),
      (p_supplier_user_id, 'Pedido confirmado', 2, 'green'),
      (p_supplier_user_id, 'Enviado',           3, 'blue'),
      (p_supplier_user_id, 'Concluído',         4, 'green'),
      (p_supplier_user_id, 'Perdido',           5, 'red');
    SELECT id INTO v_supplier_col_id FROM pipeline_columns
    WHERE user_id = p_supplier_user_id AND title = 'Entrada';
  END IF;

  SELECT COUNT(*) INTO v_pos FROM pipeline_cards
  WHERE column_id = v_supplier_col_id AND user_id = p_supplier_user_id;

  INSERT INTO pipeline_cards (column_id, user_id, title, proposal_id, origin, position)
  VALUES (v_supplier_col_id, p_supplier_user_id, p_product_name, p_proposal_id, 'auto', v_pos);
END;
$$;

-- ── SECURITY DEFINER: move cards no pipeline quando status muda ───────────────

CREATE OR REPLACE FUNCTION move_proposal_pipeline_cards(
  p_proposal_id      UUID,
  p_buyer_user_id    UUID,  -- hint only; function resolves via proposal join (SECURITY DEFINER bypasses RLS)
  p_supplier_user_id UUID,  -- hint only
  p_status           TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_user_id    UUID;
  v_supplier_user_id UUID;
  v_buyer_target     TEXT;
  v_supplier_target  TEXT;
  v_col_id           UUID;
  v_card_id          UUID;
  v_pos              INT;
BEGIN
  -- Resolve real user_ids from proposal (bypasses RLS since SECURITY DEFINER)
  SELECT b.user_id, s.user_id
    INTO v_buyer_user_id, v_supplier_user_id
    FROM proposals pr
    JOIN buyers    b ON b.id = pr.buyer_id
    JOIN suppliers s ON s.id = pr.supplier_id
   WHERE pr.id = p_proposal_id;

  -- Fall back to hint params if lookup fails
  IF v_buyer_user_id    IS NULL THEN v_buyer_user_id    := p_buyer_user_id;    END IF;
  IF v_supplier_user_id IS NULL THEN v_supplier_user_id := p_supplier_user_id; END IF;

  CASE p_status
    WHEN 'accepted'  THEN v_buyer_target := 'Aceita';       v_supplier_target := 'Pedido confirmado';
    WHEN 'refused'   THEN v_buyer_target := 'Recusada';     v_supplier_target := 'Perdido';
    WHEN 'shipped'   THEN v_buyer_target := 'Em andamento'; v_supplier_target := 'Enviado';
    WHEN 'completed' THEN v_buyer_target := 'Concluído';    v_supplier_target := 'Concluído';
    ELSE RETURN;
  END CASE;

  -- Mover card do comprador
  SELECT pc.id INTO v_card_id FROM pipeline_cards pc
  WHERE pc.proposal_id = p_proposal_id AND pc.user_id = v_buyer_user_id LIMIT 1;
  IF v_card_id IS NOT NULL THEN
    SELECT id INTO v_col_id FROM pipeline_columns
    WHERE user_id = v_buyer_user_id AND title = v_buyer_target LIMIT 1;
    IF v_col_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_pos FROM pipeline_cards
      WHERE column_id = v_col_id AND user_id = v_buyer_user_id;
      UPDATE pipeline_cards SET column_id = v_col_id, position = v_pos WHERE id = v_card_id;
    END IF;
  END IF;

  -- Mover card do fornecedor
  SELECT pc.id INTO v_card_id FROM pipeline_cards pc
  WHERE pc.proposal_id = p_proposal_id AND pc.user_id = v_supplier_user_id LIMIT 1;
  IF v_card_id IS NOT NULL THEN
    SELECT id INTO v_col_id FROM pipeline_columns
    WHERE user_id = v_supplier_user_id AND title = v_supplier_target LIMIT 1;
    IF v_col_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_pos FROM pipeline_cards
      WHERE column_id = v_col_id AND user_id = v_supplier_user_id;
      UPDATE pipeline_cards SET column_id = v_col_id, position = v_pos WHERE id = v_card_id;
    END IF;
  END IF;
END;
$$;

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Realtime ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'proposals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE proposals;
  END IF;
END;
$$;
