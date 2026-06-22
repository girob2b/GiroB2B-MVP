/**
 * GET /api/buyer/inboxes/received
 *
 * Inbox do COMPRADOR — "Ofertas recebidas".
 * Retorna as ofertas recebidas nas demandas do comprador logado,
 * agrupadas por demanda.
 *
 * Auth: requer JWT válido de usuário com demands publicadas (role buyer).
 * Método: GET (leitura, sem body).
 * Resposta: 200 { ok: true; data: ReceivedOfferGroup[] } | 401 | 500
 *
 * Contrato técnico (dev-build/run3-inboxes/00-contrato.md):
 *   - Chamado por Client Component (portanto Route Handler, não Server Action).
 *   - Usa adminClient após validação do JWT — service layer valida o escopo.
 *   - O comprador vê APENAS as ofertas das PRÓPRIAS demandas (buyerUserId = auth.uid()).
 *   - Oferta nunca aparece em superfície pública — só neste endpoint autenticado.
 *   - Cache-Control: no-store (dados privados, nunca cachear em borda).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listReceivedOffers } from "@/lib/services/inboxes";

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

  // 2. Buscar ofertas recebidas (service layer)
  // Não há gate de role buyer explícito aqui: listReceivedOffers filtra por
  // demands.buyer_user_id = auth.uid() — se o user não tem demands, retorna [].
  // Não expõe dados de outros compradores.
  try {
    const data = await listReceivedOffers(authData.user.id);
    return NextResponse.json({ ok: true, data }, { headers: NO_CACHE });
  } catch {
    return NextResponse.json(
      { ok: false, reason: "internal" },
      { status: 500, headers: NO_CACHE }
    );
  }
}
