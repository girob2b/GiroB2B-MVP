import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUseWebSearch } from "@/lib/web-search-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SCRAPER_URL = process.env.SCRAPER_URL ?? "http://girob2b-scraper:3002";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { query, filters } = body as { query?: string; filters?: Record<string, unknown> };

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json({ error: "invalid_query" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("can_use_web_search")
      .eq("id", user.id)
      .maybeSingle();

    if (!canUseWebSearch(user, profile ?? null)) {
      return NextResponse.json({ error: "web_search_not_allowed" }, { status: 403 });
    }

    const res = await fetch(`${SCRAPER_URL}/jobs/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, filters, user_id: user.id }),
    });

    const payload = await res.json().catch(() => ({}));
    return NextResponse.json(payload, { status: res.status });
  } catch (err) {
    console.error("[/api/search/web] erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "internal_error" },
      { status: 500 }
    );
  }
}
