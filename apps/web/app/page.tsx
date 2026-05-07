import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search as SearchIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import GuestShell from "@/components/layout/guest-shell";
import { listPublicDemands } from "@/lib/services/demands";
import { DemandCard } from "@/components/demands/demand-card";

export const metadata: Metadata = {
  title: "GiroB2B — Compradores publicam, vendedores contatam",
  description:
    "Marketplace B2B brasileiro: compradores publicam o que precisam comprar, vendedores assinantes contatam direto pelo WhatsApp.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Usuário autenticado vai direto pro painel
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (authData.user) redirect("/painel");

  const admin = createAdminClient();
  const [{ data: categoriesData }, demandsResult] = await Promise.all([
    admin
      .from("categories")
      .select("id, name, slug, icon")
      .eq("active", true)
      .is("parent_id", null)
      .order("sort_order", { ascending: true })
      .limit(10),
    listPublicDemands({ limit: 9 }),
  ]);

  const categories = (categoriesData ?? []) as { id: string; name: string; slug: string; icon: string | null }[];
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const featuredDemands = demandsResult.rows;

  return (
    <GuestShell>
      {/* Hero */}
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[color:var(--brand-green-50)] to-white p-8 sm:p-12">
        <div className="max-w-3xl space-y-5">
          <span className="inline-flex items-center rounded-full bg-[color:var(--brand-green-100)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--brand-green-800)]">
            Marketplace B2B do Brasil
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight text-slate-900">
            O que você precisa comprar?
          </h1>
          <p className="text-base sm:text-lg leading-relaxed text-slate-600">
            Aqui o jogo é diferente: <strong>você publica o que precisa</strong> e os fornecedores certos
            entram em contato com você pelo WhatsApp. Cadastro grátis, sem CNPJ obrigatório.
          </p>

          <form action="/buscar" method="get" className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="q" className="sr-only">Buscar necessidades</label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="q"
                  name="q"
                  placeholder="Buscar por produto, categoria, especificação..."
                  className="h-12 w-full rounded-xl border-0 bg-transparent pl-10 pr-3 text-sm focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-green-600)] px-6 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)]"
            >
              Buscar <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center">
            <Link
              href="/cadastro"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 font-semibold text-white hover:bg-slate-800"
            >
              Publicar necessidade <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/seja-vendedor"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sou vendedor
            </Link>
          </div>
        </div>
      </section>

      {/* Categorias */}
      {categories.length > 0 && (
        <section className="mt-10 space-y-4">
          <header className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Por categoria</h2>
              <p className="text-sm text-slate-500">Explore necessidades em alta nas verticais B2B.</p>
            </div>
            <Link href="/buscar" className="text-sm font-semibold text-[color:var(--brand-green-700)] hover:underline">
              Ver todas
            </Link>
          </header>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/categoria/${c.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[color:var(--brand-green-300)] hover:bg-[color:var(--brand-green-50)] hover:text-[color:var(--brand-green-700)]"
              >
                {c.icon && <span aria-hidden>{c.icon}</span>}
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Em alta */}
      {featuredDemands.length > 0 && (
        <section className="mt-12 space-y-4">
          <header className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Necessidades em alta</h2>
              <p className="text-sm text-slate-500">Compradores publicaram nas últimas semanas.</p>
            </div>
            <Link href="/buscar" className="text-sm font-semibold text-[color:var(--brand-green-700)] hover:underline">
              Ver todas
            </Link>
          </header>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredDemands.map((d) => (
              <DemandCard
                key={d.id}
                demand={d}
                categoryName={d.category_id ? categoryById.get(d.category_id)?.name ?? null : null}
              />
            ))}
          </div>
        </section>
      )}

      {/* Como funciona */}
      <section className="mt-16 rounded-3xl border border-slate-200 bg-white p-8 sm:p-10">
        <header className="space-y-1 mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Como funciona</h2>
          <p className="text-sm text-slate-500">Sem leilão. Sem carrinho. Sem pipeline.</p>
        </header>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <RoleBox title="Sou comprador">
            <ol className="space-y-3 text-sm text-slate-700">
              <li><strong className="text-slate-900">1.</strong> Cadastre seu acesso (grátis, sem CNPJ).</li>
              <li><strong className="text-slate-900">2.</strong> Publique o que você precisa comprar.</li>
              <li><strong className="text-slate-900">3.</strong> Fornecedores certos te chamam no WhatsApp.</li>
            </ol>
            <Link
              href="/cadastro"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-green-600)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)]"
            >
              Criar conta de comprador
            </Link>
          </RoleBox>
          <RoleBox title="Sou vendedor">
            <ol className="space-y-3 text-sm text-slate-700">
              <li><strong className="text-slate-900">1.</strong> Cadastre seu CNPJ e assine um plano.</li>
              <li><strong className="text-slate-900">2.</strong> Veja necessidades em tempo real, filtra por categoria e UF.</li>
              <li><strong className="text-slate-900">3.</strong> Contate compradores via WhatsApp e feche fora da plataforma.</li>
            </ol>
            <Link
              href="/seja-vendedor"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver planos de vendedor
            </Link>
          </RoleBox>
        </div>
      </section>
    </GuestShell>
  );
}

function RoleBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <div className="mt-4">{children}</div>
    </article>
  );
}
