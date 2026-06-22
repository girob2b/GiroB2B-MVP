import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search as SearchIcon, ShieldCheck, Lock, Sparkles, Eye, TrendingUp, ClipboardList, SendHorizonal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPublicDemands, countNewDemandsForSupplier } from "@/lib/services/demands";
import { DemandCard } from "@/components/demands/demand-card";
import ContactButton from "./_components/contact-button";
import { FeedViewTracker } from "./_components/feed-view-tracker";

export const metadata: Metadata = { title: "Leads — demandas disponíveis" };
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
  /** #3 — filtro "só novas desde última visita". Valor: "1" */
  new_only?: string;
  /** #11 — filtro "só não contatadas". Valor: "1" */
  uncontacted?: string;
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
  // #3 e #11 — novos filtros
  const filterNewOnly = params.new_only === "1";
  const filterUncontacted = params.uncontacted === "1";

  const admin = createAdminClient();

  // Resolve papel + status de assinatura + last_feed_view_at
  const { data: supplier } = await admin
    .from("suppliers")
    .select("id, trade_name, subscription_status, subscription_expires_at, last_feed_view_at, categories")
    .eq("user_id", authData.user.id)
    .maybeSingle<{
      id: string;
      trade_name: string;
      subscription_status: "inactive" | "trialing" | "active" | "expired";
      subscription_expires_at: string | null;
      last_feed_view_at: string | null;
      categories: string[] | null;
    }>();

  const canContact =
    !!supplier &&
    (supplier.subscription_status === "active" || supplier.subscription_status === "trialing") &&
    (!supplier.subscription_expires_at || new Date(supplier.subscription_expires_at) > new Date());

  // #3 — contador de demandas novas desde a última visita
  // Executado em paralelo com o fetch de categorias e o feed.
  // O badge usa o last_feed_view_at ANTES de ser atualizado pelo FeedViewTracker
  // (que só dispara no cliente após o render), garantindo que o usuário veja
  // o número correto antes de o badge ser zerado.
  const [
    { data: categoriesData },
    newDemandsResult,
  ] = await Promise.all([
    admin
      .from("categories")
      .select("id, name, slug")
      .eq("active", true)
      .is("parent_id", null)
      .order("sort_order", { ascending: true }),
    supplier
      ? countNewDemandsForSupplier(supplier.last_feed_view_at, {
          category_ids: supplier.categories ?? undefined,
        })
      : Promise.resolve({ count: 0, since: null }),
  ]);

  const categories = (categoriesData ?? []) as { id: string; name: string; slug: string }[];
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const selectedCategory = categories.find((c) => c.slug === categorySlug) ?? null;

  // Monta filtros para listPublicDemands
  const baseFilters = {
    query: query || null,
    state: state || null,
    only_verified: onlyVerified,
    // #3 — só novas desde última visita
    only_since: filterNewOnly && supplier?.last_feed_view_at
      ? supplier.last_feed_view_at
      : null,
    // #11 — excluir já contatadas
    exclude_contacted_by_supplier_id: filterUncontacted && supplier
      ? supplier.id
      : null,
  };

  // Fetch do feed — com ou sem categoria
  let filtered: Awaited<ReturnType<typeof listPublicDemands>>["rows"] = [];
  let totalCount = 0;

  if (selectedCategory) {
    const refined = await listPublicDemands({
      ...baseFilters,
      category_id: selectedCategory.id,
      limit: PAGE_SIZE,
      offset,
    });
    filtered = refined.rows;
    totalCount = refined.total;
  } else {
    const result = await listPublicDemands({
      ...baseFilters,
      limit: PAGE_SIZE,
      offset,
    });
    filtered = result.rows;
    totalCount = result.total;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Cópia de segurança do filtro ativo para label de resultados
  const activeFilterLabels: string[] = [];
  if (filterNewOnly) activeFilterLabels.push("novas");
  if (filterUncontacted) activeFilterLabels.push("não contatadas");

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/*
        #3 — FeedViewTracker: Client Component que dispara POST /api/supplier/feed-view
        após o render, atualizando last_feed_view_at. Colocado aqui pra garantir
        que a leitura do RSC usou o timestamp anterior ao reset.
      */}
      {supplier && <FeedViewTracker />}

      {/* Tabs: Feed de demandas | Propostas enviadas */}
      <nav className="flex gap-1 border-b border-slate-200 -mt-2" aria-label="Seções do painel do vendedor">
        <span
          aria-current="page"
          className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-brand-700 border-b-2 border-brand-600 -mb-px"
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          Feed de demandas
        </span>
        <Link
          href="/painel/leads/propostas"
          className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <SendHorizonal className="h-4 w-4" aria-hidden="true" />
          Propostas enviadas
        </Link>
      </nav>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leads</h1>
        <p className="text-sm text-slate-500">
          Demandas publicadas por compradores. Contate via WhatsApp para fechar negócio.
        </p>
      </header>

      {/*
        #3 — Banner "X demandas novas desde sua última visita"
        Peso visual de freshness: cor brand + ícone de tendência + link direto
        pro feed filtrado. Só aparece quando count > 0 e o supplier existe.
        Posicionado antes do banner de assinatura para ser o primeiro elemento
        de conteúdo que o vendedor vê ao abrir o feed.
      */}
      {supplier && newDemandsResult.count > 0 && (
        <NewDemandsBanner
          count={newDemandsResult.count}
          since={newDemandsResult.since}
          hasNewOnlyFilter={filterNewOnly}
        />
      )}

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
            <label htmlFor="q" className="sr-only">Buscar demandas</label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="q"
                name="q"
                defaultValue={query}
                placeholder="Buscar por título ou produto…"
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
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Filtrar
          </button>
        </div>

        {/*
          Linha de filtros rápidos — chips/toggle links para #3 e #11.
          Chips têm estado ativo visual claro (brand-600 preenchido vs borda apenas).
          Checkbox "Verificados" mantém o padrão do projeto (checkbox label inline).
          Filtros #3 e #11 são chips server-side (link que adiciona/remove searchParam),
          visualmente distintos do checkbox nativo para comunicar "filtro rápido".
        */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Verificados — checkbox nativo (coerente com o padrão existente) */}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 has-checked:border-brand-300 has-checked:bg-brand-50 has-checked:text-brand-700">
            <input
              type="checkbox"
              name="verified"
              value="1"
              defaultChecked={onlyVerified}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500 accent-brand-600"
            />
            <span className="inline-flex items-center gap-1 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Verificados
            </span>
          </label>

          {/*
            #3 — chip "Só novas" — visível para qualquer supplier logado.
            Ativo = brand sólido. Inativo = borda tracejada brand (sinaliza
            que há novas disponíveis quando count > 0).
          */}
          {supplier && (
            <FilterChip
              label="Só novas"
              icon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
              paramName="new_only"
              paramValue="1"
              active={filterNewOnly}
              currentParams={{ q: query, category: categorySlug, state, verified: onlyVerified, uncontacted: filterUncontacted }}
              hint={newDemandsResult.count > 0 && !filterNewOnly ? `${newDemandsResult.count} aguardando` : undefined}
            />
          )}

          {/*
            #11 — chip "Não contatadas" — visível APENAS para assinantes ativos (canContact).
            Sem assinatura, o filtro seria inócuo (nunca contataram nada).
          */}
          {supplier && canContact && (
            <FilterChip
              label="Não contatadas"
              icon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}
              paramName="uncontacted"
              paramValue="1"
              active={filterUncontacted}
              currentParams={{ q: query, category: categorySlug, state, verified: onlyVerified, new_only: filterNewOnly }}
            />
          )}
        </div>
      </form>

      {/* Contador de resultados com filtros ativos */}
      <p className="text-sm text-slate-500" aria-live="polite">
        {totalCount} lead{totalCount === 1 ? "" : "s"} disponíve{totalCount === 1 ? "l" : "is"}
        {activeFilterLabels.length > 0 && (
          <>
            {" "}·{" "}
            <span className="font-medium text-brand-600">
              {activeFilterLabels.join(" + ")}
            </span>
            {" "}
            <Link
              href="/painel/leads"
              className="underline underline-offset-2 hover:text-brand-700"
              aria-label="Limpar todos os filtros ativos"
            >
              limpar filtros
            </Link>
          </>
        )}
      </p>

      {/* Grid de leads */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-900">Nenhum lead pra essa busca</p>
          <p className="mt-2 text-sm text-slate-500">Tente outros filtros ou volte em alguns dias.</p>
          {activeFilterLabels.length > 0 && (
            <Link
              href="/painel/leads"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
            >
              Ver todos os leads
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => (
            <DemandCard
              key={d.id}
              demand={d}
              categoryName={d.category_id ? categoryById.get(d.category_id)?.name ?? null : null}
              action={
                <ContactButton
                  demandId={d.id}
                  canContact={canContact}
                  hasSupplier={!!supplier}
                />
              }
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          current={page}
          total={totalPages}
          params={{
            q: query,
            category: categorySlug,
            state,
            verified: onlyVerified,
            new_only: filterNewOnly,
            uncontacted: filterUncontacted,
          }}
        />
      )}
    </div>
  );
}

// ─── #3 — Banner "X demandas novas desde sua última visita" ──────────────────
//
// Peso visual de freshness: fundo com gradiente brand + número em destaque +
// link direto pro feed filtrado. Só renderiza quando count > 0.
// Copy diferenciada: "disponíveis" para primeira visita (since=null),
// "novas desde sua última visita" para visitas subsequentes.
function NewDemandsBanner({
  count,
  since,
  hasNewOnlyFilter,
}: {
  count: number;
  since: string | null;
  hasNewOnlyFilter: boolean;
}) {
  const isFirstVisit = since === null;
  const noun = count === 1 ? "demanda" : "demandas";
  const verb = isFirstVisit ? "disponíve" + (count === 1 ? "l" : "is") : "nova" + (count === 1 ? "" : "s");

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 sm:flex-row sm:items-center"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm">
        <TrendingUp className="h-5 w-5" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-brand-900">
          <span className="text-brand-600 text-base">{count}</span>{" "}
          {noun} {verb}
          {!isFirstVisit && " desde sua última visita"}
        </p>
        <p className="text-xs text-brand-700 mt-0.5">
          {isFirstVisit
            ? "Explore as oportunidades disponíveis no seu setor."
            : "Chegaram enquanto você estava fora. Veja primeiro quem ainda não foi contatado."}
        </p>
      </div>

      {/* CTA: se já está no filtro "só novas", não mostra o link de novo */}
      {!hasNewOnlyFilter && (
        <Link
          href="/painel/leads?new_only=1"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Ver {count === 1 ? "a nova" : "as novas"}
        </Link>
      )}
    </div>
  );
}

// ─── Chip de filtro server-side (#11 / #3) ────────────────────────────────────
//
// Chip que toglla um searchParam via Link (server-side, sem JS).
// Ativo = bg brand sólido + texto branco.
// Inativo = borda brand + texto brand (distingue do checkbox nativo).
// `hint` exibe um badge numérico inline (ex: "3 aguardando").
interface FilterChipParams {
  q: string;
  category: string;
  state: string;
  verified: boolean;
  new_only?: boolean;
  uncontacted?: boolean;
}

function FilterChip({
  label,
  icon,
  paramName,
  paramValue,
  active,
  currentParams,
  hint,
}: {
  label: string;
  icon: React.ReactNode;
  paramName: "new_only" | "uncontacted";
  paramValue: string;
  active: boolean;
  currentParams: FilterChipParams;
  hint?: string;
}) {
  // Monta href que adiciona ou remove o param deste chip,
  // preservando todos os outros params ativos.
  const buildHref = (toggleOn: boolean) => {
    const u = new URLSearchParams();
    if (currentParams.q) u.set("q", currentParams.q);
    if (currentParams.category) u.set("category", currentParams.category);
    if (currentParams.state) u.set("state", currentParams.state);
    if (currentParams.verified) u.set("verified", "1");
    if (currentParams.new_only) u.set("new_only", "1");
    if (currentParams.uncontacted) u.set("uncontacted", "1");
    if (toggleOn) {
      u.set(paramName, paramValue);
    } else {
      u.delete(paramName);
    }
    // Volta pra página 1 ao trocar filtro
    u.delete("page");
    const qs = u.toString();
    return `/painel/leads${qs ? `?${qs}` : ""}`;
  };

  if (active) {
    return (
      <Link
        href={buildHref(false)}
        aria-label={`Remover filtro: ${label}`}
        aria-pressed="true"
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        {icon}
        {label}
        {/* X inline para indicar que clicar remove o filtro */}
        <span aria-hidden="true" className="ml-0.5 opacity-70">×</span>
      </Link>
    );
  }

  return (
    <Link
      href={buildHref(true)}
      aria-label={`Filtrar por: ${label}${hint ? ` (${hint})` : ""}`}
      aria-pressed="false"
      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      {icon}
      {label}
      {hint && (
        <span className="ml-0.5 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
          {hint}
        </span>
      )}
    </Link>
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
        className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
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
  params: {
    q: string;
    category: string;
    state: string;
    verified: boolean;
    new_only: boolean;
    uncontacted: boolean;
  };
}) {
  const buildHref = (p: number) => {
    const u = new URLSearchParams();
    if (params.q) u.set("q", params.q);
    if (params.category) u.set("category", params.category);
    if (params.state) u.set("state", params.state);
    if (params.verified) u.set("verified", "1");
    if (params.new_only) u.set("new_only", "1");
    if (params.uncontacted) u.set("uncontacted", "1");
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
