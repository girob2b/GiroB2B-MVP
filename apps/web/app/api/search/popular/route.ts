import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/search/popular
 *
 * Retorna os termos mais buscados nos últimos 7 dias (mín 3 hits) — alimenta
 * o dropdown de autocomplete da Explorar substituindo o mock POPULAR_SUGGESTIONS.
 *
 * Lê de `search_terms_popular` (view sanitizada com policy anon SELECT).
 * Quando o agregado retorna < 3 termos, devolvemos a lista curada como fallback
 * pra evitar dropdown vazio durante bootstrap (sem volume de busca real ainda).
 */
const FALLBACK_TERMS = [
  "Embalagens plásticas",
  "Parafusos",
  "Tecidos",
  "Materiais de limpeza",
  "Equipamentos industriais",
  "Alimentos a granel",
];

const MIN_REAL_TERMS = 3;
const LIMIT = 10;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("search_terms_popular")
      .select("term")
      .limit(LIMIT);

    if (error) {
      console.warn("[/api/search/popular] select error:", error.message);
      return NextResponse.json({ terms: FALLBACK_TERMS, source: "fallback" });
    }

    const real = (data ?? []).map((row) => row.term as string).filter(Boolean);

    if (real.length < MIN_REAL_TERMS) {
      // Mistura: usa o que tiver de real e completa com fallback (sem duplicar).
      const seen = new Set(real.map((t) => t.toLowerCase()));
      const filler = FALLBACK_TERMS.filter((t) => !seen.has(t.toLowerCase()));
      return NextResponse.json({
        terms: [...real, ...filler].slice(0, LIMIT),
        source: real.length === 0 ? "fallback" : "mixed",
      });
    }

    return NextResponse.json({ terms: real, source: "real" });
  } catch (err) {
    console.error("[/api/search/popular] erro:", err);
    return NextResponse.json({ terms: FALLBACK_TERMS, source: "fallback" });
  }
}
