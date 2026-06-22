/**
 * GET /api/supplier/inboxes/sent
 *
 * Inbox do VENDEDOR — "Propostas enviadas".
 * Retorna a lista de contatos/ofertas que o supplier logado enviou,
 * com dados da demanda e da empresa do comprador.
 *
 * Auth: requer JWT válido de usuário com perfil supplier.
 * Método: GET (leitura, sem body).
 * Resposta: 200 { ok: true; data: SentOffer[] } | 401 | 403 | 500
 *
 * Contrato técnico (dev-build/run3-inboxes/00-contrato.md):
 *   - Chamado por Client Component (portanto Route Handler, não Server Action).
 *   - Usa adminClient após validação do JWT — service layer valida o escopo.
 *   - Nunca expõe dados de outros suppliers: supplierUserId = auth.uid().
 *   - Cache-Control: no-store (dados privados, nunca cachear em borda).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listSentOffers } from "@/lib/services/inboxes";

const NO_CACHE = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

export async function GET(): Promise<NextResponse> {
  // 1. Autenticação
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json(
      { ok: false, reason: "unauthenticated" },
      { status: 401, headers: NO_CACHE }
    );
  }

  // 2. Verificar que o usuário é supplier (gate de role)
  const admin = createAdminClient();
  const { data: supplier, error: supplierError } = await admin
    .from("suppliers")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle<{ id: string }>();

  if (supplierError) {
    return NextResponse.json(
      { ok: false, reason: "internal" },
      { status: 500, headers: NO_CACHE }
    );
  }
  if (!supplier) {
    return NextResponse.json(
      { ok: false, reason: "not_supplier" },
      { status: 403, headers: NO_CACHE }
    );
  }

  // 3. Buscar propostas enviadas (service layer)
  try {
    const data = await listSentOffers(authData.user.id);
    return NextResponse.json({ ok: true, data }, { headers: NO_CACHE });
  } catch {
    return NextResponse.json(
      { ok: false, reason: "internal" },
      { status: 500, headers: NO_CACHE }
    );
  }
}
