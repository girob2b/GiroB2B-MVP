import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Clock,
  MessageCircle,
  Sparkles,
  Store,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import GuestShell from "@/components/layout/guest-shell";
import { QuickPublishForm } from "@/components/demands/quick-publish-form";
import { DemandCard } from "@/components/demands/demand-card";
import { MockDemandCard, MOCK_DEMANDS } from "@/components/demands/mock-demand-card";
import { listPublicDemands } from "@/lib/services/demands";

const VITRINE_SLOTS = 6;

export const metadata: Metadata = {
  title: "GiroB2B — Publique o que precisa, vendedores te contatam",
  description:
    "Marketplace B2B brasileiro reverso: você publica o que precisa comprar, vendedores qualificados te contatam direto no WhatsApp. Grátis, sem CNPJ obrigatório.",
};

export const dynamic = "force-dynamic";

/**
 * Home pública = palco do comprador.
 *
 * Decisão 2026-05-25 (revisão do PR 2026-05-18):
 * - "Cara de marketplace": densidade visual + atividade percebida + social proof
 * - PALCO (60% above-the-fold): hero pra publicar + quick form
 * - PLATEIA: stats + categorias + vitrine de 6 necessidades + como funciona
 * - BANNER: CTA discreto pro vendedor (dourado, secundário)
 *
 * Hierarquia: comprador é primeira classe. Vendedor é convidado.
 * Vitrine de necessidades dupla função:
 *   - Pro comprador: social proof ("outros já estão publicando")
 *   - Pro vendedor: isca ("ó quanto lead aqui — pague pra contatar")
 *
 * Detalhes (/necessidade/[slug]) continuam públicos pra SEO. Só o botão
 * "Contatar via WhatsApp" é gated por subscription ativa.
 *
 * Stats mockados até ter volume real (decisão Vitor 2026-05-25).
 */
export default async function HomePage() {
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
      .order("sort_order", { ascending: true }),
    listPublicDemands({ limit: 6 }),
  ]);

  const categories = (categoriesData ?? []) as {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  }[];
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const recentDemands = demandsResult.rows;

  return (
    <GuestShell>
      {/* ═══════ HERO — palco do comprador ═══════ */}
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[color:var(--brand-green-50)] via-white to-[color:var(--brand-accent-50)] p-6 sm:p-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--brand-green-100)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--brand-green-800)]">
              <Sparkles className="h-3 w-3" />
              Marketplace B2B reverso
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-slate-900">
              Publique o que sua empresa precisa.{" "}
              <span className="text-[color:var(--brand-green-700)]">
                Vendedores te chamam no WhatsApp.
              </span>
            </h1>
            <p className="text-base lg:text-lg leading-relaxed text-slate-600">
              No GiroB2B, <strong>você é o disputado</strong>. Diz o que precisa comprar — fornecedores qualificados entram em contato direto pelo WhatsApp. Grátis pra sempre. Sem CNPJ obrigatório.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-sm font-medium text-slate-700">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-green-600)]" />
                Cadastro grátis
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-green-600)]" />
                Sem CNPJ obrigatório
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-green-600)]" />
                Resposta em ~18h
              </span>
            </div>
          </div>

          <div className="lg:pl-4">
            <div className="rounded-2xl bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 overflow-hidden">
              <div className="bg-[color:var(--brand-green-600)] px-5 py-3">
                <p className="text-sm font-bold text-white">Publique agora</p>
                <p className="text-xs text-[color:var(--brand-green-100)]">
                  Grátis · sem CNPJ obrigatório
                </p>
              </div>
              <div className="p-5">
                <QuickPublishForm categories={categories} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ STATS — social proof pro comprador ═══════ */}
      <section
        aria-label="Tração da plataforma"
        className="mt-8 rounded-2xl bg-slate-900 text-white px-5 py-4 sm:px-7 sm:py-5"
      >
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            value="247"
            label="necessidades esta semana"
            icon={<Sparkles className="h-4 w-4 text-[color:var(--brand-accent-300)]" />}
          />
          <Stat
            value="1.2k"
            label="vendedores prontos"
            icon={<Building2 className="h-4 w-4 text-[color:var(--brand-accent-300)]" />}
          />
          <Stat
            value="~18h"
            label="resposta média"
            icon={<Clock className="h-4 w-4 text-[color:var(--brand-accent-300)]" />}
          />
          <Stat
            value="89%"
            label="recebem 3+ contatos"
            icon={<MessageCircle className="h-4 w-4 text-[color:var(--brand-accent-300)]" />}
          />
        </ul>
      </section>

      {/* ═══════ CATEGORIAS — pílulas com ícone ═══════ */}
      {categories.length > 0 && (
        <section className="mt-10">
          <header className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Por categoria</h2>
              <p className="text-sm text-slate-500">
                Encontre vendedores qualificados em qualquer setor B2B.
              </p>
            </div>
            <Link
              href="/buscar"
              className="text-sm font-semibold text-[color:var(--brand-green-700)] hover:underline shrink-0"
            >
              Ver todas →
            </Link>
          </header>
          <div className="flex flex-wrap gap-2 sm:gap-3 overflow-x-auto -mx-2 px-2 pb-1">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/categoria/${c.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-[color:var(--brand-green-300)] hover:bg-[color:var(--brand-green-50)] hover:text-[color:var(--brand-green-800)] hover:-translate-y-0.5 whitespace-nowrap shrink-0"
              >
                {c.icon && <span aria-hidden className="text-base leading-none">{c.icon}</span>}
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════ VITRINE — 6 cards (reais + mocks de exemplo até completar) ═══════
          Estratégia (decisão Vitor 2026-05-25): mantém "cara de marketplace"
          mesmo quando volume real é baixo. Cards mockados ficam claramente
          marcados como "Exemplo". Quando volume real cobrir os 6 slots, o
          slice abaixo para de injetar mocks automaticamente. */}
      <section className="mt-14">
        <header className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Empresas como a sua já estão recebendo propostas
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Necessidades publicadas recentemente. Você pode ser a próxima.
            </p>
          </div>
          <Link
            href="/buscar"
            className="text-sm font-semibold text-[color:var(--brand-green-700)] hover:underline shrink-0"
          >
            Ver todas →
          </Link>
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentDemands.map((d) => (
            <DemandCard
              key={d.id}
              demand={d}
              categoryName={d.category_id ? categoryById.get(d.category_id)?.name ?? null : null}
            />
          ))}
          {MOCK_DEMANDS.slice(0, Math.max(0, VITRINE_SLOTS - recentDemands.length)).map(
            (mock, i) => (
              <MockDemandCard key={`mock-${i}`} demand={mock} />
            ),
          )}
        </div>
      </section>

      {/* ═══════ BANNER VENDEDOR — discreto, dourado ═══════ */}
      <section className="mt-12 rounded-2xl border border-[color:var(--brand-accent-200)] bg-gradient-to-r from-[color:var(--brand-accent-50)] to-white px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-accent-500)] text-white">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                É vendedor B2B?
              </p>
              <p className="text-sm text-slate-600 mt-0.5">
                Acesse a fila de oportunidades em tempo real. Pague só pelos leads que quiser.
              </p>
            </div>
          </div>
          <Link
            href="/seja-vendedor"
            className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--brand-accent-500)] bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--brand-accent-700)] hover:bg-[color:var(--brand-accent-500)] hover:text-white transition-colors shrink-0"
          >
            Saiba mais <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ═══════ COMO FUNCIONA — compacto ═══════ */}
      <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <header className="space-y-1 mb-6">
          <h2 className="text-xl font-bold text-slate-900">Como funciona pra você</h2>
          <p className="text-sm text-slate-500">Sem leilão. Sem carrinho. Sem pipeline. Sem taxa por venda.</p>
        </header>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Step number={1} title="Publique sua necessidade">
            Diz o que precisa comprar — título, quantidade, prazo, cidade. Em menos de 1 minuto.
          </Step>
          <Step number={2} title="Receba contato no WhatsApp">
            Vendedores qualificados veem sua necessidade e te chamam direto pelo WhatsApp.
          </Step>
          <Step number={3} title="Negocie e feche fora">
            Você conversa direto com cada fornecedor. Compara, escolhe, fecha. Sem taxa por venda.
          </Step>
        </ol>
      </section>
    </GuestShell>
  );
}

function Stat({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-slate-300 mt-1 leading-snug">{label}</p>
      </div>
    </li>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--brand-green-600)] text-sm font-bold text-white">
          {number}
        </span>
        <h3 className="text-sm sm:text-base font-bold text-slate-900">{title}</h3>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-slate-700">{children}</p>
    </li>
  );
}
