import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { JsonLd } from "@/components/seo/json-ld";

// Client sem cookies — seguro em build time (generateStaticParams / generateMetadata)
function buildClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * /explorar/[categoria] — Página SSR/ISR programática (RF-05.02).
 *
 * Renderiza lista de produtos+fornecedores da categoria server-side, indexável
 * pelo Googlebot sem precisar executar JS. ISR de 1h equilibra frescor de
 * supplier recém-cadastrado vs custo de renderização sob tráfego SEO.
 *
 * Anti-thin-content (RN-03.05/06): só prerendera categoria com ≥3 produtos
 * ativos. Combinação de URL com categoria sem volume retorna 404.
 *
 * Refinement (filtros, paginação, modal de inquiry) acontece no client via
 * /explorar?categoria=<slug> reusando o ExplorerSearch.
 */

const PAGE_SIZE = 24;
const MIN_PRODUCTS = 3;

export const revalidate = 3600;

interface ProductListingRow {
  id: string;
  supplier_id: string;
  name: string;
  slug: string;
  description: string | null;
  images: string[] | null;
  unit: string | null;
  min_order: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  supplier_name: string;
  supplier_slug: string;
  supplier_city: string | null;
  supplier_state: string | null;
  supplier_logo: string | null;
  is_verified: boolean;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

async function loadCategoryAndProducts(slug: string) {
  const supabase = buildClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id, name, slug, description")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle<CategoryRow>();

  if (!category) return null;

  const { data: products, count } = await supabase
    .from("product_listings")
    .select(
      "id, supplier_id, name, slug, description, images, unit, min_order, price_min_cents, price_max_cents, supplier_name, supplier_slug, supplier_city, supplier_state, supplier_logo, is_verified",
      { count: "exact" }
    )
    .eq("category_slug", slug)
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  const total = count ?? 0;
  if (total < MIN_PRODUCTS) return null;

  return {
    category,
    products: (products ?? []) as ProductListingRow[],
    total,
  };
}

export async function generateStaticParams() {
  // Lista categorias ativas com produtos suficientes pra evitar thin content.
  const supabase = buildClient();
  const { data } = await supabase
    .from("categories")
    .select("slug")
    .eq("active", true);
  // Não fazemos o gate de >=3 aqui pra não disparar N queries durante build —
  // o gate verdadeiro é em loadCategoryAndProducts (notFound).
  return (data ?? []).map((row: { slug: string }) => ({ categoria: row.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoria: string }>;
}): Promise<Metadata> {
  const { categoria } = await params;
  const data = await loadCategoryAndProducts(categoria);
  if (!data) return { title: "Categoria não encontrada" };

  const { category, total } = data;
  return {
    title: `Fornecedores de ${category.name} — GiroB2B`,
    description:
      `${total} fornecedores e produtos de ${category.name.toLowerCase()} no GiroB2B. ` +
      `Marketplace B2B brasileiro com cotações gratuitas pra empresas verificadas.`,
    alternates: {
      canonical: `/explorar/${category.slug}`,
    },
    openGraph: {
      title: `Fornecedores de ${category.name}`,
      description: `${total} fornecedores B2B de ${category.name.toLowerCase()} no Brasil.`,
      type: "website",
    },
  };
}

function formatPrice(cents: number | null): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function buildPriceLabel(min: number | null, max: number | null): string {
  const lo = formatPrice(min);
  const hi = formatPrice(max);
  if (lo && hi && min !== max) return `${lo} – ${hi}`;
  if (lo) return lo;
  if (hi) return hi;
  return "Sob consulta";
}

export default async function ExplorarCategoriaPage({
  params,
}: {
  params: Promise<{ categoria: string }>;
}) {
  const { categoria } = await params;
  const data = await loadCategoryAndProducts(categoria);
  if (!data) notFound();

  const { category, products, total } = data;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://girob2b.com.br").replace(/\/$/, "");

  // Schema.org CollectionPage + BreadcrumbList + ItemList (RF-05.08).
  const collectionSchema: Record<string, unknown> = {
    "@type": "CollectionPage",
    name: `Fornecedores de ${category.name}`,
    description: `${total} fornecedores B2B de ${category.name.toLowerCase()} no Brasil.`,
    url: `${baseUrl}/explorar/${category.slug}`,
    isPartOf: { "@type": "WebSite", name: "GiroB2B", url: baseUrl },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: products.slice(0, 10).map((p, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${baseUrl}/produto/${p.slug}`,
        name: p.name,
      })),
    },
  };

  const breadcrumbSchema: Record<string, unknown> = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Explorar", item: `${baseUrl}/explorar` },
      { "@type": "ListItem", position: 2, name: category.name, item: `${baseUrl}/explorar/${category.slug}` },
    ],
  };

  return (
    <div className="space-y-6">
      <JsonLd schema={[collectionSchema, breadcrumbSchema]} />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/explorar" className="hover:text-foreground transition-colors">
          Explorar
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{category.name}</span>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Fornecedores de {category.name}
        </h1>
        <p className="text-base text-muted-foreground">
          {total} {total === 1 ? "fornecedor cadastrado" : "fornecedores cadastrados"}.
          {category.description ? ` ${category.description}` : ""}
        </p>
        <Link
          href={`/explorar?categoria=${category.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--brand-green-700)] hover:text-[color:var(--brand-green-800)]"
        >
          Refinar busca
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <section
        aria-label={`Produtos de ${category.name}`}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/produto/${p.slug}`}
            className="group rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-[color:var(--brand-green-300)] hover:shadow-sm transition-all"
          >
            <div className="relative aspect-[4/3] bg-slate-50">
              {p.images?.[0] ? (
                <Image
                  src={p.images[0]}
                  alt={p.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-slate-300 text-sm">
                  Sem imagem
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <h2 className="text-sm font-semibold text-slate-900 line-clamp-2 group-hover:text-[color:var(--brand-green-700)]">
                {p.name}
              </h2>
              <p className="text-xs text-muted-foreground line-clamp-1">{p.supplier_name}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">
                  {buildPriceLabel(p.price_min_cents, p.price_max_cents)}
                </span>
                {p.supplier_state && (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {p.supplier_city ?? p.supplier_state}
                  </span>
                )}
              </div>
              {p.is_verified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[color:var(--brand-green-700)]">
                  <ShieldCheck className="h-3 w-3" />
                  Verificado
                </span>
              )}
            </div>
          </Link>
        ))}
      </section>

      {total > PAGE_SIZE && (
        <div className="flex justify-center pt-2">
          <Link
            href={`/explorar?categoria=${category.slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 transition-colors"
          >
            Ver todos os {total} fornecedores
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
