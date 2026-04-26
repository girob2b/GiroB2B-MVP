import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/search/recent-needs
 *
 * Retorna as últimas "necessidades" (cotações/buscas) registradas por compradores,
 * sanitizadas (sem user_id nem PII). Usado pelo Explorar para mostrar sugestões
 * quando o usuário ainda não digitou nada.
 *
 * Requer SUPABASE_SERVICE_ROLE_KEY porque a tabela search_needs tem RLS owner-only.
 * Só expomos campos seguros: query, description truncada, filters.state e category.
 */
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ needs: [] });
    }

    const admin = createClient(url, key, { auth: { persistSession: false } });

    const { data, error } = await admin
      .from("search_needs")
      .select("id, query, description, filters, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      // Tabela pode ainda não estar aplicada — degrada silenciosamente.
      console.warn("[/api/search/recent-needs] select error:", error.message);
      return NextResponse.json({ needs: [] });
    }

    const sanitized = (data ?? []).map((row) => {
      const f = (row.filters ?? {}) as Record<string, unknown>;
      const description =
        typeof row.description === "string" && row.description.length > 140
          ? row.description.slice(0, 137) + "…"
          : row.description;
      return {
        id: row.id as string,
        query: row.query as string,
        description,
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
