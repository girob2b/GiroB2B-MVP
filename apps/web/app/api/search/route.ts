import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const category = (sp.get("category") ?? "").trim();
  const state = (sp.get("state") ?? "").trim();
  const maxMoq = sp.get("max_moq") !== null ? Number(sp.get("max_moq")) : null;
  const minMoq = sp.get("min_moq") !== null ? Number(sp.get("min_moq")) : null;
  const sort = sp.get("sort") ?? "recent";
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const supplierTypes = (sp.get("supplier_types") ?? "").split(",").filter(Boolean);

  const supabase = await createClient();

  let query = supabase
    .from("product_listings")
    .select(
      "id, supplier_id, name, slug, description, category_id, category_slug, category_name, images, unit, min_order, price_min_cents, price_max_cents, tags, supplier_name, supplier_slug, supplier_city, supplier_state, supplier_logo, is_verified, supplier_plan, supplier_type, created_at",
      { count: "exact" }
    );

  if (q.length >= 2) {
    // Quebra em palavras e remove chars que quebram o parser do PostgREST
    // (vírgula, parênteses, ponto, aspas, barras). Cada palavra vira um
    // ILIKE separado, todos combinados por AND — "parafuso 6,5mm" procura
    // produtos que contenham 'parafuso' E '6' E '5mm' em algum campo.
    const words = q
      .split(/\s+/)
      .map((w) => w.replace(/[,.;:()"'\\]/g, ""))
      .filter((w) => w.length > 0);
    for (const w of words) {
      const safe = w.replace(/[%_]/g, "\\$&");
      query = query.or(
        `name.ilike.%${safe}%,supplier_name.ilike.%${safe}%,description.ilike.%${safe}%`
      );
    }
  }

  if (category) {
    query = query.eq("category_slug", category);
  }

  if (state) {
    query = query.eq("supplier_state", state);
  }

  if (maxMoq !== null && !isNaN(maxMoq)) {
    query = query.lte("min_order", maxMoq);
  }
  if (minMoq !== null && !isNaN(minMoq) && minMoq > 0) {
    query = query.gte("min_order", minMoq);
  }

  if (supplierTypes.length > 0) {
    query = query.in("supplier_type", supplierTypes);
  }

  switch (sort) {
    case "price":
      query = query.order("price_min_cents", { ascending: true, nullsFirst: false });
      break;
    case "moq":
      query = query.order("min_order", { ascending: true, nullsFirst: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("[/api/search]", error.message, error.code);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget: registra search_event pra alimentar agregado de termos
  // populares (migration 032). Só loga buscas com termo >= 2 chars (evita
  // poluir tabela com listagens vazias). Sem await — falha aqui não pode
  // bloquear a resposta de busca.
  if (q.length >= 2) {
    void supabase.rpc("log_search_event", {
      p_raw_query: q,
      p_filters: {
        category: category || null,
        state: state || null,
        supplier_types: supplierTypes.length ? supplierTypes : null,
      },
      p_results_count: count ?? 0,
      p_source: "explorar",
    });
  }

  return NextResponse.json({
    products: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
}
