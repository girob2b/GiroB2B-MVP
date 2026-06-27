/**
 * GET /api/buyer/comparator/[demandId]
 *
 * Comparador de cotações de uma demanda — visão privada do COMPRADOR.
 * Retorna as cotações da demanda ranqueadas por score ponderado pelos
 * pesos configurados pelo comprador (Fase 2a do Comparador de Cotações).
 *
 * Auth: requer JWT válido (Supabase). O comprador acessa APENAS as próprias demandas
 * (gate de ownership verificado no service).
 *
 * Método: GET (leitura — sem body).
 *
 * Respostas:
 *   200 { ok: true;  data: DemandComparatorResult }
 *   401 { ok: false; reason: "unauthenticated" }
 *   403 { ok: false; reason: "forbidden" }           — demanda de outro comprador
 *   404 { ok: false; reason: "not_found" }            — demanda não existe
 *   500 { ok: false; reason: "internal" }
 *
 * Cache: no-store — dados privados, personalizados por preferência do comprador.
 *
 * Contrato técnico (dev-build/comparador/00-contrato.md):
 *   - Route Handler (Client Component fetch, não Server Action — leitura).
 *   - Chamado por Client Component no dashboard do comprador.
 *   - Usa getDemandComparator (lib/services/comparator.ts) que valida ownership.
 *   - O score é calculado com os pesos do comprador (default se não configurado).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDemandComparator } from "@/lib/services/comparator";

const NO_CACHE = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ demandId: string }> }
): Promise<NextResponse> {
  // 1. Autenticação
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json(
      { ok: false, reason: "unauthenticated" },
      { status: 401, headers: NO_CACHE }
    );
  }

  const { demandId } = await params;
  if (!demandId) {
    return NextResponse.json(
      { ok: false, reason: "not_found" },
      { status: 404, headers: NO_CACHE }
    );
  }

  // 2. Busca e ranqueia cotações (service layer valida ownership)
  try {
    const data = await getDemandComparator(demandId, authData.user.id);
    return NextResponse.json({ ok: true, data }, { headers: NO_CACHE });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";

    if (msg === "demand_not_found") {
      return NextResponse.json(
        { ok: false, reason: "not_found" },
        { status: 404, headers: NO_CACHE }
      );
    }

    if (msg === "demand_not_owned") {
      return NextResponse.json(
        { ok: false, reason: "forbidden" },
        { status: 403, headers: NO_CACHE }
      );
    }

    console.error("[comparator-route] Erro inesperado:", err);
    return NextResponse.json(
      { ok: false, reason: "internal" },
      { status: 500, headers: NO_CACHE }
    );
  }
}
