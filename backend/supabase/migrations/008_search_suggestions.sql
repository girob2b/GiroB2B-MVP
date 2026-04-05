-- ============================================================
-- GiroB2B — Sugestões de Busca / Lista de Integração
-- ============================================================

CREATE TABLE IF NOT EXISTS search_suggestions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  query         TEXT NOT NULL,
  category_slug TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'ignored')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_search_suggestions_user     ON search_suggestions(user_id);
CREATE INDEX idx_search_suggestions_status   ON search_suggestions(status);
CREATE INDEX idx_search_suggestions_query    ON search_suggestions USING gin(to_tsvector('portuguese', query));

-- RLS (Row Level Security)
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;

-- Políticas: 
-- 1. Usuários podem ver suas próprias sugestões
CREATE POLICY "Users can view own suggestions" 
  ON search_suggestions FOR SELECT 
  USING (auth.uid() = user_id);

-- 2. Usuários podem criar sugestões
CREATE POLICY "Users can create suggestions" 
  ON search_suggestions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_search_suggestions
  BEFORE UPDATE ON search_suggestions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
