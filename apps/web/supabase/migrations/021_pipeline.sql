-- 021_pipeline.sql
-- Pipeline comercial por usuário: colunas e cards customizáveis

CREATE TABLE pipeline_columns (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  position   integer     NOT NULL DEFAULT 0,
  color      text        NOT NULL DEFAULT 'slate'
               CHECK (color IN ('slate','green','red','amber','blue')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE pipeline_cards (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id     uuid        NOT NULL REFERENCES pipeline_columns(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text        NOT NULL,
  description   text,
  contact_name  text,
  product_name  text,
  inquiry_id    uuid        REFERENCES inquiries(id) ON DELETE SET NULL,
  position      integer     NOT NULL DEFAULT 0,
  due_date      date,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_pipeline_columns_user ON pipeline_columns(user_id, position);
CREATE INDEX idx_pipeline_cards_column  ON pipeline_cards(column_id, position);
CREATE INDEX idx_pipeline_cards_user    ON pipeline_cards(user_id);

ALTER TABLE pipeline_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_cards   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_columns"
  ON pipeline_columns FOR ALL
  USING   (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_manage_own_cards"
  ON pipeline_cards FOR ALL
  USING   (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
