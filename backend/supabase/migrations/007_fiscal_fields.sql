-- Add fiscal and address detail columns to suppliers
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT,
  ADD COLUMN IF NOT EXISTS inscricao_estadual  TEXT,
  ADD COLUMN IF NOT EXISTS situacao_fiscal     TEXT
    CHECK (
      situacao_fiscal IS NULL OR situacao_fiscal IN (
        'simples_nacional',
        'mei',
        'lucro_presumido',
        'lucro_real',
        'lucro_arbitrado',
        'imune',
        'isento',
        'outros'
      )
    );
