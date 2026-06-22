import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon, X } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPublicDemands, type DemandFeedFilters } from "@/lib/services/demands";
import { DEMAND_KINDS, type DemandKind } from "@/lib/schemas/demands";
import { DemandCard } from "@/components/demands/demand-card";
import { PublicContactGate } from "@/components/demands/public-contact-gate";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  category?: string;
  state?: string;
  kind?: string;
  sort?: string;
  page?: string;
}

/**
 * #23 seo-canonical-buscar: metadata dinâmica com canonical.
 *
 * - Sem filtros (q='' category='' state='' kind='' page=1): canonical = /buscar,
 *   robots index=true — é a PLP principal.
 * - Com qualquer filtro ou página > 1: canonical aponta pra /buscar (versão limpa),
 *   robots noindex=true pra não desperdiçar crawl budget em combinações infinitas.
 *
 * Usamos noindex em page>1 mesmo sem filtros para evitar crawl budget em
 * variantes paginadas — somente a PLP canônica (page=1, sem filtros) é indexada.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const categorySlug = (params.category ?? "").trim();
  const state = (params.state ?? "").trim();
  const kind = (params.kind ?? "").trim();
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const hasFilters = !!(query || categorySlug || state || kind);
  const isFiltered = hasFilters || page > 1;

  // Descrição contextual quando há busca ativa
  const description = query
    ? `Demandas de compradores B2B por "${query}" no GiroB2B.`
    : "Encontre demandas publicadas por compradores B2B no GiroB2B.";

  const title = query
    ? `Busca: "${query}" — Demandas B2B`
    : page > 1
      ? `Demandas publicadas — Página ${page}`
      : "Buscar demandas B2B";

  return {
    title,
    description,
    alternates: { canonical: "/buscar" },
    // Páginas filtradas ou paginadas: noindex mas follow para que o crawler
    // alcance os links internos (cards de demanda, categoria, fornecedor).
    robots: isFiltered
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
];

/** Opções de ordenação (#7 busca-facetada-decente) */
const SORT_OPTIONS: { value: NonNullable<DemandFeedFilters["sort"]> | ""; label: string }[] = [
  { value: "", label: "Mais recentes" },
  { value: "contacts", label: "Mais contatadas" },
  { value: "deadline", label: "Prazo mais próximo" },
];

const PAGE_SIZE = 24;

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const categorySlug = (params.category ?? "").trim();
  const state = (params.state ?? "").trim().toUpperCase();
  const kindParam = (params.kind ?? "").trim();
  const kind: DemandKind | null = (DEMAND_KINDS as readonly string[]).includes(kindParam)
    ? (kindParam as DemandKind)
    : null;
  const sortParam = (params.sort ?? "").trim();
  const sort: DemandFeedFilters["sort"] =
    sortParam === "contacts" || sortParam === "deadline" || sortParam === "recent"
      ? sortParam
      : null;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const admin = createAdminClient();

  const { data: categoriesData } = await admin
    .from("categories")
    .select("id, name, slug")
    .eq("active", true)
    .is("parent_id", null)
    .order("sort_order", { ascending: true });

  const categories = (categoriesData ?? []) as { id: string; name: string; slug: string }[];
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const selectedCategory = categories.find((c) => c.slug === categorySlug) ?? null;

  const { rows, total } = await listPublicDemands({
    query: query || null,
    category_id: selectedCategory?.id ?? null,
    state: state || null,
    kind,
    sort,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Filtros ativos (para os chips removíveis)
  const activeFilters: { label: string; removeParam: string }[] = [];
  if (query) activeFilters.push({ label: `"${query}"`, removeParam: "q" });
  if (categorySlug && selectedCategory) activeFilters.push({ label: selectedCategory.name, removeParam: "category" });
  if (state) activeFilters.push({ label: state, removeParam: "state" });
  if (kind) activeFilters.push({ label: kind === "simple" ? "Simples" : "Estruturadas", removeParam: "kind" });
  if (sort) {
    const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label;
    if (sortLabel) activeFilters.push({ label: sortLabel, removeParam: "sort" });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Demandas publicadas</h1>
        <p className="text-sm text-slate-500">
          Compradores B2B publicaram aqui o que precisam comprar. Vendedores assinantes podem
          contatá-los direto pelo WhatsApp.
        </p>
      </header>

      {/* Formulário de busca (#7) */}
      <form
        method="get"
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4"
      >
        {/* Linha principal: busca + categorias + UF + tipo */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="q" className="sr-only">Buscar</label>
            <div className="relative">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="q"
                name="q"
                defaultValue={query}
                placeholder="Buscar por título, produto, especificação…"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <select
            name="category"
            defaultValue={categorySlug}
            aria-label="Categoria"
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 sm:max-w-55"
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <select
            name="state"
            defaultValue={state}
            aria-label="Estado"
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 sm:max-w-30"
          >
            <option value="">Todos UF</option>
            {BR_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
          <select
            name="kind"
            defaultValue={kind ?? ""}
            aria-label="Tipo de demanda"
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 sm:max-w-45"
          >
            <option value="">Simples + estruturadas</option>
            <option value="simple">Apenas simples</option>
            <option value="structured">Apenas estruturadas</option>
          </select>
        </div>

        {/* Linha secundária: ordenação + submit */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Ordenar por
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={sort ?? ""}
              aria-label="Ordenação dos resultados"
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Buscar
          </button>
        </div>
      </form>

      {/* Chips de filtro ativo removíveis (#7) */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtros ativos">
          <span className="text-xs font-medium text-slate-500">Filtros:</span>
          {activeFilters.map((f) => (
            <ActiveFilterChip
              key={f.removeParam}
              label={f.label}
              removeParam={f.removeParam}
              currentParams={{ q: query, category: categorySlug, state, kind: kind ?? "", sort: sort ?? "" }}
            />
          ))}
          {activeFilters.length > 1 && (
            <Link
              href="/buscar"
              className="text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700"
              aria-label="Limpar todos os filtros"
            >
              Limpar tudo
            </Link>
          )}
        </div>
      )}

      <p className="text-sm text-slate-500" aria-live="polite">
        {total} demanda{total === 1 ? "" : "s"} encontrada{total === 1 ? "" : "s"}.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-900">Nada encontrado</p>
          <p className="mt-2 text-sm text-slate-500">
            Tente outra categoria, UF ou termo de busca.
          </p>
          {activeFilters.length > 0 && (
            <Link
              href="/buscar"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
            >
              Ver todas as demandas
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((d) => (
            <DemandCard
              key={d.id}
              demand={d}
              categoryName={d.category_id ? categoryById.get(d.category_id)?.name ?? null : null}
              action={<PublicContactGate />}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          current={page}
          total={totalPages}
          params={{ q: query, category: categorySlug, state, kind: kind ?? "", sort: sort ?? "" }}
        />
      )}
    </div>
  );
}

// ─── Chip de filtro ativo removível (#7) ────────────────────────────────────

interface ActiveFilterChipCurrentParams {
  q: string;
  category: string;
  state: string;
  kind: string;
  sort: string;
}

function ActiveFilterChip({
  label,
  removeParam,
  currentParams,
}: {
  label: string;
  removeParam: string;
  currentParams: ActiveFilterChipCurrentParams;
}) {
  // Monta URL mantendo todos os params exceto o que este chip remove.
  const u = new URLSearchParams();
  if (removeParam !== "q" && currentParams.q) u.set("q", currentParams.q);
  if (removeParam !== "category" && currentParams.category) u.set("category", currentParams.category);
  if (removeParam !== "state" && currentParams.state) u.set("state", currentParams.state);
  if (removeParam !== "kind" && currentParams.kind) u.set("kind", currentParams.kind);
  if (removeParam !== "sort" && currentParams.sort) u.set("sort", currentParams.sort);
  // Volta pra página 1 ao remover filtro
  const href = `/buscar${u.toString() ? `?${u.toString()}` : ""}`;

  return (
    <Link
      href={href}
      aria-label={`Remover filtro: ${label}`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
    >
      {label}
      <X className="h-3 w-3" aria-hidden="true" />
    </Link>
  );
}

// ─── Paginação ────────────────────────────────────────────────────────────────

function Pagination({
  current,
  total,
  params,
}: {
  current: number;
  total: number;
  params: { q: string; category: string; state: string; kind: string; sort: string };
}) {
  const buildHref = (p: number) => {
    const u = new URLSearchParams();
    if (params.q) u.set("q", params.q);
    if (params.category) u.set("category", params.category);
    if (params.state) u.set("state", params.state);
    if (params.kind) u.set("kind", params.kind);
    if (params.sort) u.set("sort", params.sort);
    u.set("page", String(p));
    return `/buscar?${u.toString()}`;
  };
  return (
    <nav className="flex items-center justify-between text-sm" aria-label="Paginação">
      <span className="text-slate-500">Página {current} de {total}</span>
      <div className="flex items-center gap-2">
        {current > 1 && (
          <Link
            href={buildHref(current - 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Anterior
          </Link>
        )}
        {current < total && (
          <Link
            href={buildHref(current + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Próxima
          </Link>
        )}
      </div>
    </nav>
  );
}
