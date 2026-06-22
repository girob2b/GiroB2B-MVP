-- Migration 046: supplier feed tracking — "novas desde última visita" + filtro não-contatadas
--
-- Itens implementados:
--   #3  demandas-novas-desde-ultima-visita — coluna last_feed_view_at em suppliers
--   #11 feed-vendedor-nao-contatadas      — índice composto para filtro de exclusão
--
-- Aplicação MANUAL via Supabase SQL Editor (não há staging; preview = prod).
-- Rollback comentado ao final.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Coluna last_feed_view_at em suppliers
--    Registra a última vez que o supplier abriu /painel/leads.
--    NULL = nunca visitou (counter mostrará "todas as demandas são novas").
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS last_feed_view_at TIMESTAMPTZ;

COMMENT ON COLUMN suppliers.last_feed_view_at IS
  'Timestamp da última vez que o supplier carregou o feed /painel/leads.
   Usado para calcular "N demandas novas desde sua última visita".
   NULL = nunca visitou; nesse caso, todas as demands abertas são consideradas novas.
   Atualizado via POST /api/supplier/feed-view (server-side, service_role).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS: supplier só atualiza o próprio last_feed_view_at
--    A coluna será atualizada via adminClient (server-only) identificando o
--    supplier pelo JWT; a policy de "Suppliers manage own profile" já cobre
--    UPDATE WHERE user_id = auth.uid(). Nenhuma policy nova necessária.
--
--    Verificar: migration 001 linha ~263:
--      CREATE POLICY "Suppliers manage own profile"
--        ON suppliers FOR ALL USING (auth.uid() = user_id);
--    Essa policy já cobre SELECT e UPDATE do próprio row.
--    A atualização em si usa adminClient (bypassa RLS) — seguro porque o
--    Route Handler valida auth.uid() antes de chamar.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Índice em demands.created_at para contagem eficiente de "novas desde X"
--    O índice parcial `idx_demands_status_published` cobre (status, published_at DESC).
--    Para count por created_at em demands WHERE status='open' precisamos de:
-- ─────────────────────────────────────────────────────────────────────────────

-- NOTA: o predicate NÃO pode usar expires_at > NOW() — NOW() é STABLE, não
-- IMMUTABLE, e o Postgres rejeita funções não-IMMUTABLE em predicate de índice
-- (42P17). A view demands_public já filtra expires_at em runtime, então o índice
-- parcial só por status='open' cobre o necessário (algumas rows expiradas a mais
-- no índice são inócuas). Mesmo padrão do 047 idx_demands_contact_count_open.
CREATE INDEX IF NOT EXISTS idx_demands_created_open
  ON demands (created_at DESC)
  WHERE status = 'open';

COMMENT ON INDEX idx_demands_created_open IS
  'Índice parcial para contagem de demands abertas criadas após um timestamp.
   Suporta a query de "N novas desde última visita" do feed do supplier.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Índice composto em demand_contacts(supplier_id, demand_id)
--    Suporta o filtro "só não-contatadas": subquery que retorna demand_ids já
--    contatados por este supplier. O índice existente (supplier_id, clicked_at)
--    não cobre lookup eficiente por demand_id para o filtro NOT IN.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_demand_contacts_supplier_demand
  ON demand_contacts (supplier_id, demand_id);

COMMENT ON INDEX idx_demand_contacts_supplier_demand IS
  'Índice composto para o filtro "só não-contatadas" no feed do supplier.
   Permite lookup eficiente do conjunto de demand_ids já contatados por um supplier.';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (executar manualmente se precisar reverter):
--
--   ALTER TABLE suppliers DROP COLUMN IF EXISTS last_feed_view_at;
--   DROP INDEX IF EXISTS idx_demands_created_open;
--   DROP INDEX IF EXISTS idx_demand_contacts_supplier_demand;
--
-- Não há dados destruídos — rollback é seguro a qualquer momento.
-- ─────────────────────────────────────────────────────────────────────────────

COMMIT;
