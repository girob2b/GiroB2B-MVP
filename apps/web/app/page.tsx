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
import { PublicContactGate } from "@/components/demands/public-contact-gate";
import { Carousel } from "@/components/ui/carousel";
import { listPublicDemands } from "@/lib/services/demands";
import { getCategoryIcon } from "@/lib/category-icons";
import { PublicCompaniesSection } from "@/components/buyers/public-companies-section";

const VITRINE_SLOTS = 16;

export const metadata: Metadata = {
  title: "GiroB2B — Demandas B2B ao vivo. Publique o que precisa, vendedores te contatam.",
  description:
    "Marketplace B2B brasileiro reverso: veja demandas reais de compradores ou publique o que sua empresa precisa. Vendedores qualificados entram em contato pelo WhatsApp. Grátis.",
};

export const dynamic = "force-dynamic";

/**
 * Home pública — feed-first.
 *
 * Decisão 2026-06-22 (Run A - Headline, bloco4):
 * O feed de demandas é o protagonista da home. Visitante anônimo vê
 * demandas reais + mocks anonimizados logo acima da dobra — o diferencial
 * estratégico do marketplace reverse fica evidente sem precisar explicar.
 *
 * Hierarquia da página:
 *   1. FEED — demandas abertas agora (+ entrada pra busca/categorias)  ← above fold
 *   2. HERO COMPACTO — QuickPublishForm + copy buyer-first              ← compacto
 *   3. STATS — social proof (mockados até ter volume real)
 *   4. COMO FUNCIONA — 3 passos
 *   5. BANNER VENDEDOR — discreto, dourado
 *
 * Supersede a decisão de 2026-05-25 ("hero no topo"). O feed é agora o palco.
 * Stats mockados: decisão Vitor 2026-05-25 mantida — não mexa aqui sem
 * confirmar com o Vitor (ver item #10 stats-mock-disclaimer no AVISOS).
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
    listPublicDemands({ limit: VITRINE_SLOTS }),
  ]);

  const categories = (categoriesData ?? []) as {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  }[];
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const recentDemands = demandsResult.rows;

  // Quantos mocks injetar para preencher VITRINE_SLOTS
  const mockCount = Math.max(0, VITRINE_SLOTS - recentDemands.length);

  // Filtros de categoria do topo — só as principais (≤6) + "Ver todas" (#hub-categorias)
  const topCategories = categories.slice(0, 6);

  return (
    <GuestShell>
      {/* ═══════════════════════════════════════════════════════════════
          0. FILTROS DE CATEGORIA — logo abaixo da busca do header, no topo
          do conteúdo. Linha horizontal limpa: ~6 principais + "Ver todas →".
      ═══════════════════════════════════════════════════════════════ */}
      {topCategories.length > 0 && (
        <nav
          aria-label="Filtrar por categoria"
          className="mb-6 flex flex-wrap items-center gap-2"
        >
          {topCategories.map((c) => {
            const CatIcon = getCategoryIcon(c.icon, c.slug);
            return (
              <Link
                key={c.id}
                href={`/categoria/${c.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 whitespace-nowrap"
              >
                <CatIcon className="h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden="true" />
                {c.name}
              </Link>
            );
          })}
          <Link
            href="/categorias"
            className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-all hover:bg-brand-100 whitespace-nowrap"
          >
            Ver todas <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </nav>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          1. FEED — protagonista da home. Visível logo acima da dobra.
          "Isto é o que compradores estão pedindo agora."
      ═══════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="feed-heading">
        {/* Cabeçalho do feed — título à esquerda, "Ver todas as demandas" à direita */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h1
              id="feed-heading"
              className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
            >
              Demandas abertas agora
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Compradores B2B publicaram isso. Vendedores assinantes contatam pelo WhatsApp.
            </p>
          </div>
          <Link
            href="/buscar"
            className="hidden sm:inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-brand-300 hover:text-brand-700 hover:shadow-md"
          >
            Ver todas as demandas <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Carrossel de 1 linha (estilo Mercado Livre) — setas + scroll-snap.
            Os cards são RSC; o carrossel client só cuida do scroll/teclado. */}
        <Carousel ariaLabel="Demandas abertas agora" itemNoun="Demanda" accent="gold">
          {recentDemands.map((d) => (
            <DemandCard
              key={d.id}
              demand={d}
              categoryName={
                d.category_id ? (categoryById.get(d.category_id)?.name ?? null) : null
              }
              action={<PublicContactGate />}
            />
          ))}
          {MOCK_DEMANDS.slice(0, mockCount).map((mock, i) => (
            <MockDemandCard key={`mock-${i}`} demand={mock} action={<PublicContactGate />} />
          ))}
        </Carousel>

        {/* Mobile-only: "Ver todas as demandas" (no desktop fica na linha do título) */}
        <div className="mt-6 sm:hidden">
          <Link
            href="/buscar"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-brand-300 hover:text-brand-700 hover:shadow-md"
          >
            Ver todas as demandas <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          1b. VITRINE DE EMPRESAS COMPRADORAS (opt-in) — abaixo do feed.
          SEMPRE visível: empresas reais opted-in primeiro, slots restantes
          preenchidos com cards de exemplo (cold-start), igual ao feed.
          Só não-PII (razão social, setor, cidade/UF, selo, contagem).
      ═══════════════════════════════════════════════════════════════ */}
      <PublicCompaniesSection />

      {/* ═══════════════════════════════════════════════════════════════
          2. HERO COMPACTO — comprador publica; vendedor é convidado.
          Secundário ao feed mas mantém a proposta de valor clara.
      ═══════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="hero-heading"
        className="mt-14 rounded-3xl border border-slate-200 bg-linear-to-br from-brand-50 via-white to-gold-50 p-6 sm:p-10"
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.1fr_1fr] md:items-start">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-800">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Marketplace B2B reverso
            </span>
            <h2
              id="hero-heading"
              className="font-heading text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-slate-900"
            >
              Publique o que sua empresa precisa.{" "}
              <span className="text-brand-700">
                Vendedores te chamam no WhatsApp.
              </span>
            </h2>
            <p className="text-base leading-relaxed text-slate-600">
              No GiroB2B, <strong>você é o disputado</strong>. Diz o que precisa comprar —
              fornecedores qualificados entram em contato direto. Grátis pra sempre. Sem CNPJ
              obrigatório.
            </p>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-sm font-medium text-slate-700">
              <li className="inline-flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-brand-600"
                  aria-hidden="true"
                />
                Cadastro grátis
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-brand-600"
                  aria-hidden="true"
                />
                Sem CNPJ obrigatório
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-brand-600"
                  aria-hidden="true"
                />
                Resposta em ~18h
              </li>
            </ul>
          </div>

          {/* Form de publicar — CTA primário do comprador */}
          <div className="lg:pl-4">
            <div className="rounded-2xl bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 overflow-hidden">
              <div className="bg-brand-600 px-5 py-3">
                <p className="text-sm font-bold text-white">Publique agora</p>
                <p className="text-xs text-brand-100">
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

      {/* ═══════════════════════════════════════════════════════════════
          3. STATS — social proof (projeção; ver item #10 no AVISOS)
          Números são estimativas/metas — asterisco + nota discreta (#10).
      ═══════════════════════════════════════════════════════════════ */}
      <section
        aria-label="Projeções da plataforma"
        className="mt-8 rounded-2xl bg-slate-900 text-white px-5 py-4 sm:px-7 sm:py-5"
      >
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            value="247*"
            label="demandas esta semana"
            icon={
              <Sparkles
                className="h-4 w-4 text-gold-300"
                aria-hidden="true"
              />
            }
          />
          <Stat
            value="1.2k*"
            label="vendedores prontos"
            icon={
              <Building2
                className="h-4 w-4 text-gold-300"
                aria-hidden="true"
              />
            }
          />
          <Stat
            value="~18h*"
            label="resposta média"
            icon={
              <Clock
                className="h-4 w-4 text-gold-300"
                aria-hidden="true"
              />
            }
          />
          <Stat
            value="89%*"
            label="recebem 3+ contatos"
            icon={
              <MessageCircle
                className="h-4 w-4 text-gold-300"
                aria-hidden="true"
              />
            }
          />
        </ul>
        {/* Nota de estimativa — discreta mas honesta (#10 stats-mock-disclaimer) */}
        <p className="mt-3 text-[11px] text-slate-500 leading-snug">
          * Projeções baseadas em benchmarks de mercado B2B. Dados reais serão exibidos conforme o volume crescer.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          4. COMO FUNCIONA — compacto
      ═══════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="como-funciona-heading"
        className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"
      >
        <header className="space-y-1 mb-6">
          <h2
            id="como-funciona-heading"
            className="font-heading text-xl font-bold text-slate-900"
          >
            Como funciona pra você
          </h2>
          <p className="text-sm text-slate-500">
            Sem leilão. Sem carrinho. Sem pipeline. Sem taxa por venda.
          </p>
        </header>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Step number={1} title="Publique sua demanda">
            Diz o que precisa comprar — título, quantidade, prazo, cidade. Em menos de 1 minuto.
          </Step>
          <Step number={2} title="Receba contato no WhatsApp">
            Vendedores qualificados veem sua demanda e te chamam direto pelo WhatsApp.
          </Step>
          <Step number={3} title="Negocie e feche fora">
            Você conversa direto com cada fornecedor. Compara, escolhe, fecha. Sem taxa por venda.
          </Step>
        </ol>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          5. BANNER VENDEDOR — discreto, dourado
      ═══════════════════════════════════════════════════════════════ */}
      <section className="mt-10 rounded-2xl border border-gold-200 bg-linear-to-r from-gold-50 to-white px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500 text-white"
              aria-hidden="true"
            >
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">É vendedor B2B?</p>
              <p className="text-sm text-slate-600 mt-0.5">
                Acesse a fila de oportunidades em tempo real. Pague só pelos leads que quiser.
              </p>
            </div>
          </div>
          <Link
            href="/seja-vendedor"
            className="inline-flex items-center gap-2 rounded-xl border border-gold-500 bg-white px-5 py-2.5 text-sm font-semibold text-gold-700 hover:bg-gold-500 hover:text-white transition-colors shrink-0"
          >
            Saiba mais <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </GuestShell>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

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
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
          aria-hidden="true"
        >
          {number}
        </span>
        <h3 className="text-sm sm:text-base font-bold text-slate-900">{title}</h3>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-slate-700">{children}</p>
    </li>
  );
}
