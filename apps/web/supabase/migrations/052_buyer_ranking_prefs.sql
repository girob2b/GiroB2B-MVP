-- Migration 052: preferências de ranking do comprador para o Comparador de Cotações
--
-- Fase 2a do Comparador de Cotações (branch feat/comparador-cotacoes, 2026-06-27).
-- O comprador pode configurar pesos por fator (preço/prazo/distância) e
-- preferência de método de pagamento. Esses dados são lidos pelo serviço
-- getDemandComparator para ranquear as cotações recebidas por demanda.
--
-- ranking_weights: JSONB com keys {price, deadline, distance}, floats 0-1 que somam 1.0.
--   NULL = usa default do sistema: price=0.5, deadline=0.3, distance=0.2.
--   CHECK garante presença das três keys e que a soma fica em 1.0 ± 0.01 (float tolerance).
--
-- payment_preference: TEXT[], subconjunto canônico de offer_payment_methods (migration 051).
--   NULL ou array vazio = sem preferência (todas as cotações são consideradas "match").
--   Não entra no score ponderado — é usado como flag de match/destaque no comparador.
--
-- Aplicação MANUAL via Supabase Management API / SQL Editor (não há staging;
-- preview da Vercel = banco de prod). Idempotente. Rollback comentado ao final.
--
-- Smoke SQL pós-aplicação:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'buyers'
--     AND column_name IN ('ranking_weights', 'payment_preference');
--   -- Deve retornar 2 rows (jsonb, ARRAY).

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Colunas de preferência de ranking em buyers
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS ranking_weights JSONB
    CONSTRAINT chk_ranking_weights_keys CHECK (
      ranking_weights IS NULL
      OR (
        jsonb_typeof(ranking_weights) = 'object'
        AND (ranking_weights ? 'price')
        AND (ranking_weights ? 'deadline')
        AND (ranking_weights ? 'distance')
        AND (ranking_weights->>'price')::float    BETWEEN 0 AND 1
        AND (ranking_weights->>'deadline')::float BETWEEN 0 AND 1
        AND (ranking_weights->>'distance')::float BETWEEN 0 AND 1
        AND abs(
              (ranking_weights->>'price')::float
            + (ranking_weights->>'deadline')::float
            + (ranking_weights->>'distance')::float
            - 1.0
            ) < 0.01
      )
    ),
  ADD COLUMN IF NOT EXISTS payment_preference TEXT[]
    CONSTRAINT chk_payment_preference_values CHECK (
      payment_preference IS NULL
      OR payment_preference <@ ARRAY['a_vista','pix','boleto','cartao','parcelado','faturado_30d']::TEXT[]
    )
    CONSTRAINT chk_payment_preference_length CHECK (
      payment_preference IS NULL OR cardinality(payment_preference) <= 6
    );

COMMENT ON COLUMN public.buyers.ranking_weights IS
  'Pesos de ranking do comprador para o Comparador de Cotações. JSONB com as keys
   {price, deadline, distance}, cada uma float 0–1, somando 1.0 (tolerância ±0.01).
   NULL = sistema usa default: price=0.5, deadline=0.3, distance=0.2.
   Adicionado em migration 052 (Fase 2a Comparador, 2026-06-27).';

COMMENT ON COLUMN public.buyers.payment_preference IS
  'Métodos de pagamento preferidos pelo comprador (TEXT[], nullable). Subconjunto dos
   valores canônicos de offer_payment_methods (migration 051):
     a_vista | pix | boleto | cartao | parcelado | faturado_30d
   NULL ou array vazio = sem preferência (todas as cotações "matcham").
   Não entra no score ponderado; é flag de match/destaque no Comparador.
   Adicionado em migration 052 (Fase 2a Comparador, 2026-06-27).';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (executar manualmente se precisar reverter):
--
-- ALTER TABLE public.buyers
--   DROP COLUMN IF EXISTS ranking_weights,
--   DROP COLUMN IF EXISTS payment_preference;
-- ─────────────────────────────────────────────────────────────────────────────
