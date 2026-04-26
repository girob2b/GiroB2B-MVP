-- ═══════════════════════════════════════════════════════════════════════════
--  Migration 023 — Pipeline bilateral: fallback de títulos
--
--  Bug original: move_proposal_pipeline_cards (criada em 022_proposals.sql)
--  buscava colunas por título exato ("Aceita", "Concluído", etc.). Se o
--  comprador tem pipeline criado antes da feature de propostas — com colunas
--  "Fechado" em vez de "Concluído", "Aprovado" em vez de "Aceita" — o card
--  não era movido automaticamente.
--
--  Fix: cada status alvo agora tem uma lista de aliases (case-insensitive).
--  A função procura a coluna do usuário pelo primeiro alias que bater.
--
--  Ver: AVISOS.md → "Pipeline bilateral — cards do comprador não movem".
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION move_proposal_pipeline_cards(
  p_proposal_id      UUID,
  p_buyer_user_id    UUID,
  p_supplier_user_id UUID,
  p_status           TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_user_id    UUID;
  v_supplier_user_id UUID;
  v_buyer_aliases    TEXT[];
  v_supplier_aliases TEXT[];
  v_col_id           UUID;
  v_card_id          UUID;
  v_pos              INT;
BEGIN
  -- Resolve user_ids reais via proposal (SECURITY DEFINER bypassa RLS)
  SELECT b.user_id, s.user_id
    INTO v_buyer_user_id, v_supplier_user_id
    FROM proposals pr
    JOIN buyers    b ON b.id = pr.buyer_id
    JOIN suppliers s ON s.id = pr.supplier_id
   WHERE pr.id = p_proposal_id;

  IF v_buyer_user_id    IS NULL THEN v_buyer_user_id    := p_buyer_user_id;    END IF;
  IF v_supplier_user_id IS NULL THEN v_supplier_user_id := p_supplier_user_id; END IF;

  -- Mapeia status → aliases aceitos. Primeiro item = nome canônico (criado
  -- no setup default em 022); demais cobrem pipelines legados ou customizados.
  CASE p_status
    WHEN 'accepted' THEN
      v_buyer_aliases    := ARRAY['Aceita',            'Aceito',     'Aprovada',  'Aprovado',  'Confirmada', 'Confirmado'];
      v_supplier_aliases := ARRAY['Pedido confirmado', 'Confirmado', 'Aceito',    'Aprovado',  'Em negociação'];
    WHEN 'refused' THEN
      v_buyer_aliases    := ARRAY['Recusada',          'Recusado',   'Rejeitada', 'Cancelada', 'Perdida',     'Cancelado'];
      v_supplier_aliases := ARRAY['Perdido',           'Recusada',   'Rejeitada', 'Cancelado'];
    WHEN 'shipped' THEN
      v_buyer_aliases    := ARRAY['Em andamento',      'Em rota',    'Enviada',   'Despachada', 'Aguardando entrega'];
      v_supplier_aliases := ARRAY['Enviado',           'Em rota',    'Despachado','Em andamento'];
    WHEN 'completed' THEN
      v_buyer_aliases    := ARRAY['Concluído',         'Concluido',  'Fechado',   'Finalizada','Finalizado','Entregue',  'Completo', 'Completa'];
      v_supplier_aliases := ARRAY['Concluído',         'Concluido',  'Fechado',   'Finalizada','Finalizado','Entregue',  'Venda fechada'];
    ELSE RETURN;
  END CASE;

  -- ── Buyer ──────────────────────────────────────────────────────────────
  SELECT pc.id INTO v_card_id FROM pipeline_cards pc
   WHERE pc.proposal_id = p_proposal_id AND pc.user_id = v_buyer_user_id LIMIT 1;

  IF v_card_id IS NOT NULL THEN
    -- Procura a primeira coluna do usuário cujo título bate (case-insensitive)
    -- com QUALQUER alias da lista. ORDER BY array_position garante prioridade
    -- ao primeiro alias (canônico) quando o usuário tem várias opções.
    SELECT pc_col.id INTO v_col_id
      FROM pipeline_columns pc_col
     WHERE pc_col.user_id = v_buyer_user_id
       AND lower(pc_col.title) = ANY (SELECT lower(unnest(v_buyer_aliases)))
     ORDER BY array_position(
       (SELECT array_agg(lower(a)) FROM unnest(v_buyer_aliases) a),
       lower(pc_col.title)
     )
     LIMIT 1;

    IF v_col_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_pos FROM pipeline_cards
       WHERE column_id = v_col_id AND user_id = v_buyer_user_id;
      UPDATE pipeline_cards SET column_id = v_col_id, position = v_pos WHERE id = v_card_id;
    END IF;
  END IF;

  -- ── Supplier ───────────────────────────────────────────────────────────
  SELECT pc.id INTO v_card_id FROM pipeline_cards pc
   WHERE pc.proposal_id = p_proposal_id AND pc.user_id = v_supplier_user_id LIMIT 1;

  IF v_card_id IS NOT NULL THEN
    SELECT pc_col.id INTO v_col_id
      FROM pipeline_columns pc_col
     WHERE pc_col.user_id = v_supplier_user_id
       AND lower(pc_col.title) = ANY (SELECT lower(unnest(v_supplier_aliases)))
     ORDER BY array_position(
       (SELECT array_agg(lower(a)) FROM unnest(v_supplier_aliases) a),
       lower(pc_col.title)
     )
     LIMIT 1;

    IF v_col_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_pos FROM pipeline_cards
       WHERE column_id = v_col_id AND user_id = v_supplier_user_id;
      UPDATE pipeline_cards SET column_id = v_col_id, position = v_pos WHERE id = v_card_id;
    END IF;
  END IF;
END;
$$;
