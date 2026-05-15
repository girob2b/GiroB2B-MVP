import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search as SearchIcon, ShieldCheck, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPublicDemands } from "@/lib/services/demands";
import { DemandCard } from "@/components/demands/demand-card";
import ContactButton from "./_components/contact-button";

export const metadata: Metadata = { title: "Leads — necessidades disponíveis" };
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
  verified?: string;
  page?: string;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const categorySlug = (params.category ?? "").trim();
  const state = (params.state ?? "").trim().toUpperCase();
  const onlyVerified = params.verified === "1";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const admin = createAdminClient();

  // Resolve papel + status de assinatura
  const { data: supplier } = await admin
    .from("suppliers")
    .select("id, trade_name, subscription_status, subscription_expires_at")
    .eq("user_id", authData.user.id)
    .maybeSingle<{
      id: string;
      trade_name: string;
      subscription_status: "inactive" | "trialing" | "active" | "expired";
      subscription_expires_at: string | null;
    }>();

  const canContact =
    !!supplier &&
    (supplier.subscription_status === "active" || supplier.subscription_status === "trialing") &&
    (!supplier.subscription_expires_at || new Date(supplier.subscription_expires_at) > new Date());

  const [{ data: categoriesData }, { rows, total }] = await Promise.all([
    admin
      .from("categories")
      .select("id, name, slug")
      .eq("active", true)
      .is("parent_id", null)
      .order("sort_order", { ascending: true }),
    listPublicDemands({
      query: query || null,
      state: state || null,
      only_verified: onlyVerified,
      limit: PAGE_SIZE,
      offset,
    }),
  ]);

  const categories = (categoriesData ?? []) as { id: string; name: string; slug: string }[];
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const selectedCategory = categories.find((c) => c.slug === categorySlug) ?? null;

  // Filtro de categoria aplicado em memória após o fetch (ou re-query). Para
  // simplicidade, refazemos a query com category_id se houve seleção.
  let filtered = rows;
  let totalCount = total;
  if (selectedCategory) {
    const refined = await listPublicDemands({
      query: query || null,
      category_id: selectedCategory.id,
      state: state || null,
      only_verified: onlyVerified,
      limit: PAGE_SIZE,
      offset,
    });
    filtered = refined.rows;
    totalCount = refined.total;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leads</h1>
        <p className="text-sm text-slate-500">
          Necessidades publicadas por compradores. Contate via WhatsApp para fechar negócio.
        </p>
      </header>

      {/* Banner de assinatura */}
      {!supplier ? (
        <BannerNoSupplier />
      ) : canContact ? (
        <BannerActive supplierName={supplier.trade_name} expiresAt={supplier.subscription_expires_at} />
      ) : (
        <BannerInactive />
      )}

      {/* Filtros */}
      <form method="get" className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="q" className="sr-only">Buscar</label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="q"
                name="q"
                defaultValue={query}
                placeholder="Buscar por título ou produto…"
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
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[color:var(--brand-green-600)] px-5 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)]"
          >
            Filtrar
          </button>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            name="verified"
            value="1"
            defaultChecked={onlyVerified}
            className="h-4 w-4 rounded border-slate-300 text-[color:var(--brand-green-600)] focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
          />
          <span className="inline-flex items-center gap-1">
            Apenas compradores
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[color:var(--brand-green-600)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              ✓ Verificados
            </span>
          </span>
        </label>
      </form>

      <p className="text-sm text-slate-500">
        {totalCount} lead{totalCount === 1 ? "" : "s"} disponíve{totalCount === 1 ? "l" : "is"}.
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-900">Nenhum lead pra essa busca</p>
          <p className="mt-2 text-sm text-slate-500">Tente outros filtros ou volte em alguns dias.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => (
            <div key={d.id} className="flex flex-col gap-3">
              <DemandCard
                demand={d}
                categoryName={d.category_id ? categoryById.get(d.category_id)?.name ?? null : null}
              />
              <ContactButton demandId={d.id} canContact={canContact} hasSupplier={!!supplier} />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination current={page} total={totalPages} params={{ q: query, category: categorySlug, state, verified: onlyVerified }} />
      )}
    </div>
  );
}

function BannerActive({ supplierName, expiresAt }: { supplierName: string; expiresAt: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
      <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-emerald-900">Assinatura ativa</p>
        <p className="text-emerald-700">
          {supplierName} — você pode contatar todos os leads. {expiresAt && <>Vence em {formatDate(expiresAt)}.</>}
        </p>
      </div>
    </div>
  );
}

function BannerInactive() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center">
      <Lock className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-amber-900">Assinatura inativa</p>
        <p className="text-amber-800">
          Você pode ver todos os leads em modo preview, mas o botão de contato exige plano ativo.
        </p>
      </div>
      <Link
        href="/seja-vendedor"
        className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
      >
        Ver planos
      </Link>
    </div>
  );
}

function BannerNoSupplier() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
      <Lock className="h-5 w-5 shrink-0 text-slate-500" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-slate-900">Você ainda não é vendedor</p>
        <p className="text-slate-600">
          Cadastre-se como vendedor para contatar compradores diretamente.
        </p>
      </div>
      <Link
        href="/seja-vendedor"
        className="inline-flex items-center justify-center rounded-lg bg-[color:var(--brand-green-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)]"
      >
        Quero vender
      </Link>
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
  params: { q: string; category: string; state: string; verified: boolean };
}) {
  const buildHref = (p: number) => {
    const u = new URLSearchParams();
    if (params.q) u.set("q", params.q);
    if (params.category) u.set("category", params.category);
    if (params.state) u.set("state", params.state);
    if (params.verified) u.set("verified", "1");
    u.set("page", String(p));
    return `/painel/leads?${u.toString()}`;
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
