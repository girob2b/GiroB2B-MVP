import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/search/recent-needs
 *
 * Retorna as últimas "necessidades" (cotações/buscas) registradas por compradores,
 * sanitizadas (sem user_id nem PII). Usado pelo Explorar para mostrar sugestões
 * quando o usuário ainda não digitou nada.
 *
 * Lê da VIEW `search_needs_public` (migration 031) com policy `anon SELECT`.
 * Não usa mais SERVICE_ROLE — VIEW limita colunas e RLS controla acesso.
 * Recomendação dev-security 2026-04-30.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("search_needs_public")
      .select("id, query, description, filters, created_at")
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      // Migration 031 pode não estar aplicada ainda OU search_needs vazia — degrada silencioso.
      console.warn("[/api/search/recent-needs] select error:", error.message);
      return NextResponse.json({ needs: [] });
    }

    const sanitized = (data ?? []).map((row) => {
      const f = (row.filters ?? {}) as Record<string, unknown>;
      return {
        id: row.id as string,
        query: row.query as string,
        description: row.description as string | null,
        state: typeof f.state === "string" ? f.state : null,
        category: typeof f.category === "string" ? f.category : null,
        created_at: row.created_at as string,
      };
    });

    return NextResponse.json({ needs: sanitized });
  } catch (err) {
    console.error("[/api/search/recent-needs] erro:", err);
    return NextResponse.json({ needs: [] });
  }
}
