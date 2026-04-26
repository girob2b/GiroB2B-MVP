import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/search/needs
 * Registra uma "necessidade de pesquisa" do comprador. Quando a busca interna
 * não cobre o que ele quer e a Pesquisa na web está gated, o buyer pode
 * pedir aos admins que cadastrem manualmente (T2-11 em docs/MVP_SCOPE.md).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const filters = body.filters && typeof body.filters === "object" ? body.filters : {};

    if (query.length < 2) {
      return NextResponse.json({ error: "invalid_query" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("search_needs")
      .insert({
        user_id: user.id,
        query,
        description,
        filters,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("[/api/search/needs] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ need: data }, { status: 201 });
  } catch (err) {
    console.error("[/api/search/needs] erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "internal_error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("search_needs")
      .select("id, query, description, filters, status, admin_notes, created_at, resolved_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ needs: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "internal_error" },
      { status: 500 }
    );
  }
}
