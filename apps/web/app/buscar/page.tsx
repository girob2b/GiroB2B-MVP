import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPublicDemands } from "@/lib/services/demands";
import { DEMAND_KINDS, type DemandKind } from "@/lib/schemas/demands";
import { DemandCard } from "@/components/demands/demand-card";

export const metadata: Metadata = {
  title: "Buscar necessidades",
  description: "Encontre necessidades publicadas por compradores B2B no GiroB2B.",
};
export const dynamic = "force-dynamic";

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
];

const PAGE_SIZE = 24;

interface SearchParams {
  q?: string;
  category?: string;
  state?: string;
  kind?: string;
  page?: string;
}

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
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Necessidades publicadas</h1>
        <p className="text-sm text-slate-500">
          Compradores B2B publicaram aqui o que precisam comprar. Vendedores assinantes podem
          contatá-los direto pelo WhatsApp.
        </p>
      </header>

      <form method="get" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="q" className="sr-only">Buscar</label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="q"
              name="q"
              defaultValue={query}
              placeholder="Buscar por título, produto, especificação…"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
            />
          </div>
        </div>
        <select
          name="category"
          defaultValue={categorySlug}
          className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)] sm:max-w-[220px]"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select
          name="state"
          defaultValue={state}
          className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)] sm:max-w-[120px]"
        >
          <option value="">Todos UF</option>
          {BR_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </select>
        <select
          name="kind"
          defaultValue={kind ?? ""}
          className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)] sm:max-w-[180px]"
        >
          <option value="">Simples + estruturadas</option>
          <option value="simple">Apenas simples</option>
          <option value="structured">Apenas estruturadas</option>
        </select>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[color:var(--brand-green-600)] px-5 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)]"
        >
          Buscar
        </button>
      </form>

      <p className="text-sm text-slate-500">
        {total} necessidade{total === 1 ? "" : "s"} encontrada{total === 1 ? "" : "s"}.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-900">Nada encontrado</p>
          <p className="mt-2 text-sm text-slate-500">
            Tente outra categoria, UF ou termo de busca.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((d) => (
            <DemandCard
              key={d.id}
              demand={d}
              categoryName={d.category_id ? categoryById.get(d.category_id)?.name ?? null : null}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination current={page} total={totalPages} params={{ q: query, category: categorySlug, state, kind: kind ?? "" }} />
      )}
    </div>
  );
}

function Pagination({
  current,
  total,
  params,
}: {
  current: number;
  total: number;
  params: { q: string; category: string; state: string; kind: string };
}) {
  const buildHref = (p: number) => {
    const u = new URLSearchParams();
    if (params.q) u.set("q", params.q);
    if (params.category) u.set("category", params.category);
    if (params.state) u.set("state", params.state);
    if (params.kind) u.set("kind", params.kind);
    u.set("page", String(p));
    return `/buscar?${u.toString()}`;
  };
  return (
    <nav className="flex items-center justify-between text-sm">
      <span className="text-slate-500">Página {current} de {total}</span>
      <div className="flex items-center gap-2">
        {current > 1 && (
          <Link
            href={buildHref(current - 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Anterior
          </Link>
        )}
        {current < total && (
          <Link
            href={buildHref(current + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Próxima
          </Link>
        )}
      </div>
    </nav>
  );
}
