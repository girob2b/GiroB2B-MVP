import type { Metadata } from "next";
import Link from "next/link";
import { listCategoriesWithDemandCount } from "@/lib/services/demands";
import { getCategoryIcon } from "@/lib/category-icons";

export const metadata: Metadata = {
  title: "Categorias — GiroB2B",
  description:
    "Explore todas as categorias de demandas B2B publicadas no GiroB2B e encontre oportunidades no seu setor.",
  alternates: { canonical: "/categorias" },
};

/**
 * Hub de categorias (#9 hub-categorias) — RSC, revalidate 1h.
 *
 * Consome listCategoriesWithDemandCount() — uma query aggregada, sem N+1.
 * Grid md:3 / lg:4 com contagem real de demandas abertas por categoria.
 * Cada card linka pra /categoria/[slug].
 */
export const revalidate = 3600;

export default async function CategoriasPage() {
  let categories: Awaited<ReturnType<typeof listCategoriesWithDemandCount>> = [];

  try {
    categories = await listCategoriesWithDemandCount();
  } catch {
    // Fail-soft: se Supabase falhar transitório, renderiza estado vazio
    // ao invés de propagar erro para o error.tsx.
    categories = [];
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Categorias
        </h1>
        <p className="text-sm text-slate-500">
          Explore por setor e encontre demandas B2B no seu segmento.
        </p>
      </header>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-900">
            Nenhuma categoria disponível
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Volte em breve ou{" "}
            <Link
              href="/buscar"
              className="font-semibold text-brand-600 underline"
            >
              busque por palavra-chave
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul
          role="list"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon, cat.slug);
            return (
              <li key={cat.id}>
                <Link
                  href={`/categoria/${cat.slug}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                  aria-label={`${cat.name} — ${cat.demand_count} demanda${cat.demand_count === 1 ? "" : "s"}`}
                >
                  {/* Ícone do setor */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>

                  {/* Nome da categoria */}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-brand-700">
                      {cat.name}
                    </p>
                    {/* Contagem real — argumento de venda da assinatura */}
                    <p
                      className="mt-0.5 text-xs text-slate-500"
                      aria-label={`${cat.demand_count} demanda${cat.demand_count === 1 ? " aberta" : "s abertas"}`}
                    >
                      {cat.demand_count > 0 ? (
                        <>
                          <span className="font-semibold text-brand-700">
                            {cat.demand_count}
                          </span>{" "}
                          demanda{cat.demand_count === 1 ? "" : "s"}
                        </>
                      ) : (
                        "Nenhuma demanda aberta"
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
