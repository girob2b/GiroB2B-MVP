import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPublicDemands } from "@/lib/services/demands";
import { DemandCard } from "@/components/demands/demand-card";

export const revalidate = 3600; // ISR 1h

interface RouteParams {
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from("categories")
    .select("name")
    .eq("slug", slug)
    .maybeSingle<{ name: string }>();
  if (!data) return { title: "Categoria não encontrada" };
  return {
    title: `Demandas em ${data.name}`,
    description: `Compradores B2B publicando demandas na categoria ${data.name} no GiroB2B.`,
    alternates: { canonical: `/categoria/${slug}` },
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
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: category } = await admin
    .from("categories")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle<{ id: string; name: string; slug: string }>();

  if (!category) notFound();

  const { rows, total } = await listPublicDemands({ category_id: category.id, limit: 60 });

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-500">
        <Link href="/buscar" className="hover:underline">Demandas</Link>
        <span className="mx-1.5">›</span>
        <span className="text-slate-700">{category.name}</span>
      </nav>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Demandas em {category.name}
        </h1>
        <p className="text-sm text-slate-500">
          {total} compradore{total === 1 ? "" : "s"} publicaram nesta categoria.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-900">
            Nenhuma demanda aberta nesta categoria
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Volte em alguns dias ou{" "}
            <Link href="/buscar" className="font-semibold text-[color:var(--brand-green-700)] underline">
              veja outras categorias
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((d) => (
            <DemandCard key={d.id} demand={d} categoryName={category.name} />
          ))}
        </div>
      )}
    </div>
  );
}
