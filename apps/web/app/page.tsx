import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import GuestShell from "@/components/layout/guest-shell";
import { QuickPublishForm } from "@/components/demands/quick-publish-form";

export const metadata: Metadata = {
  title: "GiroB2B — Compradores publicam, vendedores contatam",
  description:
    "Marketplace B2B brasileiro: compradores publicam o que precisam comprar, vendedores assinantes contatam direto pelo WhatsApp.",
};

export const dynamic = "force-dynamic";

/**
 * Home pública do app interno = view do comprador.
 *
 * Decisão de produto 2026-05-18:
 * - Sem feed de necessidades na raiz (esse conteúdo é pro vendedor aprovado,
 *   que entra pelo /painel/leads). Vendedor não-aprovado nem chega aqui — vem
 *   pela landing externa e fica em waitlist.
 * - Sem CTAs "Sou vendedor" — aquisição de vendedor é função da landing.
 * - O foco aqui é só: publique sua necessidade.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (authData.user) redirect("/painel");

  const admin = createAdminClient();
  const { data: categoriesData } = await admin
    .from("categories")
    .select("id, name, slug")
    .eq("active", true)
    .is("parent_id", null)
    .order("sort_order", { ascending: true });

  const categories = (categoriesData ?? []) as { id: string; name: string; slug: string }[];

  return (
    <GuestShell>
      {/* Hero — pitch do comprador + form rápido */}
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[color:var(--brand-green-50)] via-white to-white p-6 sm:p-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          {/* Coluna esquerda — pitch */}
          <div className="space-y-5">
            <span className="inline-flex items-center rounded-full bg-[color:var(--brand-green-100)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--brand-green-800)]">
              Marketplace B2B do Brasil
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-slate-900">
              O que você precisa comprar?
            </h1>
            <p className="text-base lg:text-lg leading-relaxed text-slate-600">
              Aqui o jogo é diferente: <strong>você publica o que precisa</strong> e os fornecedores
              certos entram em contato com você pelo WhatsApp. Cadastro grátis, sem CNPJ obrigatório.
            </p>

            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-green-100)] text-[10px] font-bold text-[color:var(--brand-green-700)]">1</span>
                <span>Publique sua necessidade em menos de 1 minuto.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-green-100)] text-[10px] font-bold text-[color:var(--brand-green-700)]">2</span>
                <span>Vendedores qualificados te chamam direto no WhatsApp.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-green-100)] text-[10px] font-bold text-[color:var(--brand-green-700)]">3</span>
                <span>Negocie e feche fora da plataforma — sem taxa por venda.</span>
              </li>
            </ul>
          </div>

          {/* Coluna direita — quick-publish em destaque */}
          <div className="lg:pl-4">
            <div className="rounded-2xl bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
              <div className="rounded-t-2xl bg-[color:var(--brand-green-600)] px-5 py-3">
                <p className="text-sm font-bold text-white">Publique agora</p>
                <p className="text-xs text-[color:var(--brand-green-100)]">Grátis · sem CNPJ obrigatório</p>
              </div>
              <div className="p-5">
                <QuickPublishForm categories={categories} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona — só comprador */}
      <section className="mt-16 rounded-3xl border border-slate-200 bg-white p-8 sm:p-10">
        <header className="space-y-1 mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Como funciona pra você</h2>
          <p className="text-sm text-slate-500">Sem leilão. Sem carrinho. Sem pipeline.</p>
        </header>
        <ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Step number={1} title="Publique sua necessidade">
            Diz o que precisa comprar (título, quantidade, prazo, cidade). Em menos de 1 minuto, sem CNPJ obrigatório.
          </Step>
          <Step number={2} title="Receba contato no WhatsApp">
            Vendedores qualificados veem sua necessidade e te chamam direto pelo WhatsApp — com mensagem já pronta.
          </Step>
          <Step number={3} title="Negocie e feche fora da plataforma">
            Você conversa direto com cada fornecedor. Compara, escolhe e fecha. Sem taxa por venda.
          </Step>
        </ol>
        {/* CTAs duplicados removidos (decisão 2026-05-24): o quick-publish form
            no hero acima já é o CTA primário. Repetir aqui era redundante. */}
      </section>
    </GuestShell>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--brand-green-600)] text-sm font-bold text-white">
          {number}
        </span>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{children}</p>
    </li>
  );
}
