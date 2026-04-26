"use client";

import { useEffect, useState } from "react";
import { Clock, MapPin, Search, Sparkles } from "lucide-react";

interface RecentNeed {
  id: string;
  query: string;
  description: string | null;
  state: string | null;
  category: string | null;
  created_at: string;
}

interface RecentNeedsSuggestionsProps {
  /** Chamado quando o usuário clica em um card. Recebe a query e o estado (se houver). */
  onPick: (patch: { query: string; state?: string; category?: string }) => void;
}

/** Sugestões curadas (fallback quando não há dados reais ainda). */
const FALLBACK_SUGGESTIONS: Array<{ query: string; description: string; state?: string }> = [
  { query: "Embalagens de papelão kraft", description: "Comprador em SP busca 5.000 caixas mensais com impressão personalizada.", state: "SP" },
  { query: "Uniformes corporativos", description: "Rede de franquias no RJ precisa de 300 peças para nova unidade.", state: "RJ" },
  { query: "Fornecedor de insumos químicos", description: "Indústria em MG procura fornecedor homologado para 2025.", state: "MG" },
  { query: "Brindes promocionais ecológicos", description: "Agência busca fornecedor para kit de 1.000 unidades." },
  { query: "Componentes eletrônicos", description: "Startup de hardware quer parceria recorrente para PCBs." },
  { query: "Papelaria personalizada", description: "Escritório em POA busca blocos e cartões em volume mensal." },
];

function formatRelative(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 60) return `${Math.max(1, minutes)} min atrás`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.round(hours / 24);
    return `${days}d atrás`;
  } catch {
    return "";
  }
}

export function RecentNeedsSuggestions({ onPick }: RecentNeedsSuggestionsProps) {
  const [needs, setNeeds] = useState<RecentNeed[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/search/recent-needs", { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const json = (await r.json()) as { needs: RecentNeed[] };
        if (!cancelled) setNeeds(json.needs ?? []);
      } catch {
        if (!cancelled) setNeeds([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = needs === null;
  const items = !loading && needs && needs.length > 0
    ? needs
    : FALLBACK_SUGGESTIONS.map((s, i) => ({
        id: `fb-${i}`,
        query: s.query,
        description: s.description,
        state: s.state ?? null,
        category: null,
        created_at: new Date().toISOString(),
      }));
  const isFallback = !loading && (!needs || needs.length === 0);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--brand-accent-50)]">
          <Sparkles className="h-4 w-4 text-[color:var(--brand-accent-700)]" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {isFallback ? "Ideias para começar" : "Cotações recentes de compradores"}
          </h2>
          <p className="text-xs text-slate-500">
            {isFallback
              ? "Sugestões de buscas comuns no marketplace."
              : "O que outras empresas estão buscando agora. Clique para explorar."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() =>
                onPick({
                  query: n.query,
                  state: n.state ?? undefined,
                  category: n.category ?? undefined,
                })
              }
              className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[color:var(--brand-primary-300)] hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-[color:var(--brand-primary-700)]">
                  {n.query}
                </p>
                <div className="shrink-0 w-7 h-7 rounded-full bg-slate-100 group-hover:bg-[color:var(--brand-primary-100)] flex items-center justify-center transition-colors">
                  <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-[color:var(--brand-primary-600)] transition-colors" />
                </div>
              </div>
              {n.description && (
                <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {n.description}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between pt-1">
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  {n.state && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {n.state}
                    </span>
                  )}
                  {!isFallback && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelative(n.created_at)}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-300 group-hover:text-[color:var(--brand-primary-600)] transition-colors">
                  Buscar →
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
