/**
 * POST /api/supplier/feed-view
 *
 * Marca o timestamp de "última visita ao feed" do supplier logado.
 * Chamado pelo Client Component FeedViewTracker logo após o feed de leads
 * renderizar — dessa forma o RSC já leu o contador com o valor ANTERIOR
 * (o badge mostra as novas), e só então o client atualiza o timestamp.
 *
 * Auth: requer JWT válido (usuário logado com role supplier).
 * Méthodo: POST (mutation, sem body necessário).
 * Resposta: 200 { ok: true } | 401 | 403 | 500
 *
 * Contrato técnico (dev-build/marketplace-bloco2/00-contrato.md):
 *   - Nunca exportar como Server Action (é chamado por Client Component).
 *   - Usa adminClient internamente (server-only, bypassa RLS) após validar JWT.
 *   - O supplier só atualiza o próprio row (identificado via auth.uid()).
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  // 1. Validar autenticação
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  // 2. Verificar que o usuário é supplier
  const admin = createAdminClient();
  const { data: supplier, error: supplierError } = await admin
    .from("suppliers")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle<{ id: string }>();

  if (supplierError) {
    return NextResponse.json({ ok: false, reason: "internal" }, { status: 500 });
  }
  if (!supplier) {
    return NextResponse.json({ ok: false, reason: "not_supplier" }, { status: 403 });
  }

  // 3. Atualizar last_feed_view_at no próprio row do supplier
  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("suppliers")
    .update({ last_feed_view_at: now })
    .eq("id", supplier.id);

  if (updateError) {
    return NextResponse.json({ ok: false, reason: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, {
    headers: {
      // Previne caching de mutation por proxies/CDN intermediários.
      "Cache-Control": "no-store",
      // Defesa em profundidade padrão.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
