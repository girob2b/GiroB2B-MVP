-- ============================================================
-- Migration 013: Chat conversations + messages
--
-- Adds the real-time chat layer for buyer ↔ supplier contact.
-- Two entry points:
--   1. Via inquiry (context_type = 'inquiry')   → one thread per inquiry
--   2. Direct contact (context_type = 'direct') → one thread per pair
-- ============================================================

-- ── conversations ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id             UUID NOT NULL REFERENCES buyers(id)    ON DELETE CASCADE,
  supplier_id          UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  inquiry_id           UUID           REFERENCES inquiries(id) ON DELETE SET NULL,
  context_type         TEXT NOT NULL DEFAULT 'direct'
                         CHECK (context_type IN ('inquiry', 'direct_purchase', 'direct')),
  product_id           UUID           REFERENCES products(id) ON DELETE SET NULL,
  product_name         TEXT,
  status               TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'archived', 'blocked')),
  last_message_at      TIMESTAMPTZ,
  last_message_preview TEXT,
  buyer_unread         INT  NOT NULL DEFAULT 0 CHECK (buyer_unread    >= 0),
  supplier_unread      INT  NOT NULL DEFAULT 0 CHECK (supplier_unread >= 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One conversation per inquiry
CREATE UNIQUE INDEX IF NOT EXISTS uq_conv_inquiry
  ON conversations(inquiry_id)
  WHERE inquiry_id IS NOT NULL;

-- One direct/direct_purchase channel per buyer-supplier pair
CREATE UNIQUE INDEX IF NOT EXISTS uq_conv_direct
  ON conversations(buyer_id, supplier_id)
  WHERE inquiry_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_conv_buyer      ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conv_supplier   ON conversations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_conv_last_msg   ON conversations(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_conv_status     ON conversations(status);

-- ── chat_messages ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL
                    CHECK (char_length(content) BETWEEN 1 AND 5000),
  message_type    TEXT NOT NULL DEFAULT 'text'
                    CHECK (message_type IN ('text', 'inquiry_ref', 'product_ref', 'system')),
  metadata        JSONB,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_conversation ON chat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_msg_sender       ON chat_messages(sender_id);

-- ── Trigger: atualiza conversation ao inserir mensagem ─────────────────────────

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_buyer BOOLEAN;
BEGIN
  -- Verifica se o remetente é o comprador desta conversa
  SELECT EXISTS(
    SELECT 1 FROM buyers
     WHERE id = (SELECT buyer_id FROM conversations WHERE id = NEW.conversation_id)
       AND user_id = NEW.sender_id
  ) INTO v_is_buyer;

  IF v_is_buyer THEN
    -- Remetente é o comprador → incrementa não-lidas do fornecedor
    UPDATE conversations
    SET last_message_at      = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 120),
        supplier_unread      = supplier_unread + 1,
        updated_at           = NOW()
    WHERE id = NEW.conversation_id;
  ELSE
    -- Remetente é o fornecedor → incrementa não-lidas do comprador
    UPDATE conversations
    SET last_message_at      = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 120),
        buyer_unread         = buyer_unread + 1,
        updated_at           = NOW()
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_conversation_on_message ON chat_messages;
CREATE TRIGGER trg_update_conversation_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ── Trigger: updated_at em conversations ──────────────────────────────────────

DROP TRIGGER IF EXISTS conversations_updated_at ON conversations;
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;

-- conversations: participantes podem ver e atualizar
DROP POLICY IF EXISTS "Conversation participants can select" ON conversations;
CREATE POLICY "Conversation participants can select" ON conversations
  FOR SELECT USING (
    buyer_id    IN (SELECT id FROM buyers    WHERE user_id = auth.uid())
    OR
    supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Buyer can insert conversation" ON conversations;
CREATE POLICY "Buyer can insert conversation" ON conversations
  FOR INSERT WITH CHECK (
    buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Conversation participants can update" ON conversations;
CREATE POLICY "Conversation participants can update" ON conversations
  FOR UPDATE USING (
    buyer_id    IN (SELECT id FROM buyers    WHERE user_id = auth.uid())
    OR
    supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
  );

-- chat_messages: participantes da conversa podem ver e inserir
DROP POLICY IF EXISTS "Message participants can select" ON chat_messages;
CREATE POLICY "Message participants can select" ON chat_messages
  FOR SELECT USING (
    sender_id = auth.uid()
    OR
    conversation_id IN (
      SELECT id FROM conversations WHERE
        buyer_id    IN (SELECT id FROM buyers    WHERE user_id = auth.uid())
        OR
        supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Message participants can insert" ON chat_messages;
CREATE POLICY "Message participants can insert" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND
    conversation_id IN (
      SELECT id FROM conversations WHERE
        buyer_id    IN (SELECT id FROM buyers    WHERE user_id = auth.uid())
        OR
        supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
    )
  );

-- ── Realtime ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Habilita Realtime nas duas tabelas (idempotente)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END;
$$;
