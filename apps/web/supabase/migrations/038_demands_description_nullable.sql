-- Migration 038: descrição da demanda vira opcional
-- Decisão de produto 2026-05-14 — proposta simples não exige descrição
-- rica; título + foto + condições já trazem contexto suficiente.

BEGIN;

ALTER TABLE demands ALTER COLUMN description DROP NOT NULL;

-- Remove CHECK constraint que exigia length(description) BETWEEN 20 AND 5000.
-- Mantemos só o limite máximo (validado pelo Zod no app).
ALTER TABLE demands DROP CONSTRAINT IF EXISTS demands_description_check;
ALTER TABLE demands ADD CONSTRAINT demands_description_check
  CHECK (description IS NULL OR length(description) <= 5000);

COMMIT;
