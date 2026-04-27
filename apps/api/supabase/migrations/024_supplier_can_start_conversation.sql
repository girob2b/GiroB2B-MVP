-- ═══════════════════════════════════════════════════════════════════════════
--  Migration 024 — Supplier pode iniciar conversa a partir de inquiry
--
--  Bug original: a policy "Buyer can insert conversation" em public.conversations
--  era a ÚNICA policy de INSERT, e seu WITH CHECK exigia que o caller fosse
--  o buyer. Supplier autenticado tentando criar conversa pra responder uma
--  inquiry (genérica ou direcionada) era bloqueado silenciosamente — a action
--  redirecionava de volta sem dar erro visível.
--
--  Fix: adiciona policy permitindo o SUPPLIER criar conversation quando:
--    1. supplier_id = supplier dele
--    2. Existe inquiry_id vinculada
--    3. A inquiry é genérica (supplier_id null) OU já estava destinada
--       diretamente a este supplier
--
--  Bate o caminho do botão "Iniciar negociação" em /painel/inquiries/[id].
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Supplier can insert conversation from inquiry" ON public.conversations;

CREATE POLICY "Supplier can insert conversation from inquiry"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Caller é dono do supplier_id que está sendo inserido
    supplier_id IN (
      SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid()
    )
    -- E há uma inquiry vinculada visível ao caller (genérica ou direcionada a ele)
    AND inquiry_id IS NOT NULL
    AND EXISTS (
      SELECT 1
        FROM public.inquiries i
       WHERE i.id = conversations.inquiry_id
         AND (
           i.supplier_id IS NULL
           OR i.supplier_id IN (
             SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid()
           )
         )
    )
  );
