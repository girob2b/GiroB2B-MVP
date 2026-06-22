import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPublicDemands } from "@/lib/services/demands";
import { DemandCard } from "@/components/demands/demand-card";
import { PublicContactGate } from "@/components/demands/public-contact-gate";

/**
 * /categoria/[slug] — #22 paginacao-categoria.
 *
 * Aceita searchParam `page` (inteiro >= 1) e pagina com PAGE_SIZE por página,
 * reutilizando o padrão de paginação SSR do /buscar (buildHref + Pagination).
 * Substituiu o limite fixo de 60 que truncava silenciosamente.
 *
 * Canonical: sempre /categoria/[slug] sem page (página 1) para evitar
 * URLs duplicadas indexadas (#23 seo-canonical-buscar).
 */

// ISR 1h — a contagem de demandas por categoria não precisa ser real-time.
// Paginação força dynamic off somente quando ?page > 1 (via searchParams).
// A geração estática dos slugs continua funcionando.
export const revalidate = 3600;

const PAGE_SIZE = 24;

interface RouteParams {
  slug: string;
}

interface SearchParams {
  page?: string;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const admin = createAdminClient();
  const { data } = await admin
    .from("categories")
    .select("name")
    .eq("slug", slug)
    .maybeSingle<{ name: string }>();
  if (!data) return { title: "Categoria não encontrada" };

  // #23 seo-canonical-buscar: canonical sempre aponta pra página 1 (sem ?page).
  // Páginas > 1 ficam indexáveis mas tem canonical pra versão base — evita
  // duplicação sem noindex agressivo (a paginação ainda tem valor de SEO).
  return {
    title: page > 1 ? `Demandas em ${data.name} — Página ${page}` : `Demandas em ${data.name}`,
    description: `Compradores B2B publicando demandas na categoria ${data.name} no GiroB2B.`,
    alternates: { canonical: `/categoria/${slug}` },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export async function generateStaticParams() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("categories")
    .select("slug")
    .eq("active", true)
    .is("parent_id", null);
  return (data ?? []).map((c) => ({ slug: c.slug as string }));
}

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const admin = createAdminClient();

  const { data: category } = await admin
    .from("categories")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle<{ id: string; name: string; slug: string }>();

  if (!category) notFound();

  const { rows, total } = await listPublicDemands({
    category_id: category.id,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-500">
        <Link href="/buscar" className="hover:underline">Demandas</Link>
        <span className="mx-1.5">›</span>
        <span className="text-slate-700">{category.name}</span>
      </nav>

      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">
          Demandas em {category.name}
        </h1>
        <p className="text-sm text-slate-500">
          {total} compradore{total === 1 ? "" : "s"} publicaram nesta categoria.
          {totalPages > 1 && (
            <span className="ml-1 text-slate-400">
              Página {page} de {totalPages}.
            </span>
          )}
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-900">
            Nenhuma demanda aberta nesta categoria
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Volte em alguns dias ou{" "}
            <Link
              href="/buscar"
              className="font-semibold text-brand-700 underline"
            >
              veja outras categorias
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((d) => (
            <DemandCard
              key={d.id}
              demand={d}
              categoryName={category.name}
              action={<PublicContactGate />}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          current={page}
          total={totalPages}
          slug={category.slug}
        />
      )}
    </div>
  );
}

// ─── Paginação ────────────────────────────────────────────────────────────────

function Pagination({
  current,
  total,
  slug,
}: {
  current: number;
  total: number;
  slug: string;
}) {
  const buildHref = (p: number) => {
    if (p === 1) return `/categoria/${slug}`;
    return `/categoria/${slug}?page=${p}`;
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
