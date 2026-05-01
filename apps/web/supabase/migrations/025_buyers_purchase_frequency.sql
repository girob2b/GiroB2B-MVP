-- ═══════════════════════════════════════════════════════════════════════════
--  Migration 025 — Adiciona buyers.purchase_frequency
--
--  Bug: o onboarding do buyer pergunta "Frequência de compra" (Toda semana,
--  Mensal, Eventual, etc.) e o service onboarding.service.ts faz upsert em
--  buyers com `purchase_frequency`. Mas a coluna nunca foi criada — então
--  o INSERT/UPSERT falhava com "column does not exist", o usuário travava
--  na última etapa do onboarding com "Erro ao salvar dados do comprador".
--
--  Fix: cria a coluna como TEXT opcional (sem CHECK rígido — values vêm do
--  client com strings tipo "weekly", "monthly", "occasional"; a UI já
--  controla o domínio).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS purchase_frequency TEXT;

COMMENT ON COLUMN public.buyers.purchase_frequency IS
  'Frequência declarada de compra do buyer (livre, vinda do onboarding). Ex.: weekly, monthly, occasional, project_based.';
