import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SCRAPER_URL = process.env.SCRAPER_URL ?? "http://girob2b-scraper:3002";

/**
 * GET  /api/search/web/company/:key   — detalhe (id ou cnpj)
 * POST /api/search/web/company/:key   — envia contact_request (id obrigatório)
 * Ver docs/WEB_SCRAPING.md §7.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const res = await fetch(`${SCRAPER_URL}/companies/${encodeURIComponent(key)}`);
  const payload = await res.json().catch(() => ({}));
  return NextResponse.json(payload, { status: res.status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const body = await req.json().catch(() => ({}));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const res = await fetch(`${SCRAPER_URL}/companies/${encodeURIComponent(key)}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, user_id: user.id }),
  });
  const payload = await res.json().catch(() => ({}));
  return NextResponse.json(payload, { status: res.status });
}
