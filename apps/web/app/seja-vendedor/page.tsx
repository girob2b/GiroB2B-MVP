import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, MessageCircle, Target, Zap } from "lucide-react";
import SupplierWaitlistForm from "@/components/seja-vendedor/supplier-waitlist-form";
import { AlreadyApprovedCard } from "@/components/seja-vendedor/already-approved-card";

export const metadata: Metadata = {
  title: "Seja vendedor — receba leads B2B qualificados",
  description:
    "No GiroB2B, compradores publicam o que precisam comprar. Vendedores assinantes contatam direto pelo WhatsApp.",
};

export default function SejaVendedorPage() {
  return (
    <div className="space-y-8">
      {/* Path A: já fui aprovado (gate de cadastro pós-waitlist).
          Decisão Vitor 2026-05-24 — vendedor com email aprovado consegue
          criar conta agora; quem não está aprovado segue o form abaixo. */}
      <AlreadyApprovedCard />

      {/* Hero 2 colunas: pitch à esquerda + waitlist form à direita */}
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[color:var(--brand-green-50)] to-white p-6 sm:p-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div className="space-y-4">
            <span className="inline-flex items-center rounded-full bg-[color:var(--brand-green-100)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--brand-green-800)]">
              Para vendedores B2B
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-slate-900">
              Pare de prospectar no escuro. Receba leads de compradores que já estão pedindo o que você vende.
            </h1>
            <p className="text-base leading-relaxed text-slate-600">
              No GiroB2B, compradores B2B publicam o que precisam comprar. Vendedores assinantes vêem cada
              necessidade em tempo real e contatam o comprador direto pelo WhatsApp, com a mensagem já pré-formatada.
            </p>
            <p className="text-sm text-slate-500">
              Estamos abrindo a plataforma pra vendedores aos poucos. Cadastre-se na lista — a equipe vai
              avaliar e te enviar o acesso quando liberar.
            </p>
            <div className="pt-2">
              <Link
                href="/buscar"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--brand-green-700)] hover:underline"
              >
                Ver necessidades publicadas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="lg:pl-4">
            <div className="rounded-2xl bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
              <div className="rounded-t-2xl bg-[color:var(--brand-green-600)] px-5 py-3">
                <p className="text-sm font-bold text-white">Quero vender</p>
                <p className="text-xs text-[color:var(--brand-green-100)]">Entre na lista de espera</p>
              </div>
              <div className="p-5">
                <SupplierWaitlistForm source="seja_vendedor_hero" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">Como funciona</h2>
          <p className="text-sm text-slate-500">3 passos. Sem CRM, sem pipeline interno, sem complicação.</p>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Step icon={<Target className="h-5 w-5" />} number={1} title="Encontre necessidades">
            Filtra por categoria, estado e termo. Vê título, quantidade, prazo e orçamento estimado.
          </Step>
          <Step icon={<MessageCircle className="h-5 w-5" />} number={2} title="Contate via WhatsApp">
            Um clique abre o WhatsApp com mensagem pronta. O comprador recebe direto no celular dele.
          </Step>
          <Step icon={<BadgeCheck className="h-5 w-5" />} number={3} title="Feche fora da plataforma">
            Sem taxa por venda. Você cobra pela assinatura mensal — sem limite de contatos.
          </Step>
        </div>
      </section>

      {/* Planos */}
      <section className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">Planos</h2>
          <p className="text-sm text-slate-500">
            Comece com o Start. Migre pro Pro quando precisar de volume e benefícios extras.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 max-w-3xl mx-auto">
          <PlanCard tier="Start" price="R$ 89/mês" tagline="Para quem está validando o canal" disabled>
            <li>Acesso ao feed de necessidades</li>
            <li>Contato direto via WhatsApp</li>
            <li>Filtros por categoria e UF</li>
            <li>Suporte por email</li>
          </PlanCard>
          <PlanCard tier="Pro" price="R$ 349/mês" tagline="Para quem fecha negócio recorrente" highlight disabled>
            <li>Tudo do Start</li>
            <li>Contatos ilimitados</li>
            <li>Filtros avançados (palavra-chave, busca textual)</li>
            <li>Selo Verificado GiroB2B</li>
            <li>Acesso prioritário a leads de compradores verificados</li>
            <li>Suporte direto via WhatsApp</li>
          </PlanCard>
        </div>
      </section>

      {/* CTA final — segundo waitlist form */}
      <section className="rounded-3xl bg-slate-900 px-8 py-10 text-white sm:px-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div className="space-y-4">
            <Zap className="h-8 w-8 text-[color:var(--brand-accent-300)]" />
            <h2 className="text-2xl font-bold">Pronto pra ver leads reais?</h2>
            <p className="text-slate-300">
              Cadastre-se na lista de espera — vamos avaliar e enviar o link de acesso pelo seu email.
              Até lá, você pode explorar o feed em modo preview.
            </p>
            <Link
              href="/buscar"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white hover:underline"
            >
              Ver feed em preview <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-5 text-slate-900">
            <SupplierWaitlistForm source="seja_vendedor_cta" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({
  icon,
  number,
  title,
  children,
}: {
  icon: React.ReactNode;
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)]">
          {icon}
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Passo {number}</span>
      </div>
      <h3 className="mt-3 text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

function PlanCard({
  tier,
  price,
  tagline,
  highlight,
  disabled,
  children,
}: {
  tier: string;
  price?: string;
  tagline: string;
  highlight?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article
      className={`rounded-2xl border p-6 ${
        highlight
          ? "border-[color:var(--brand-green-300)] bg-[color:var(--brand-green-50)] ring-2 ring-[color:var(--brand-green-200)]"
          : "border-slate-200 bg-white"
      }`}
    >
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tier}</p>
        {price && <p className="text-2xl font-bold text-slate-900">{price}</p>}
        <h3 className="text-base font-semibold text-slate-700">{tagline}</h3>
      </header>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {children}
      </ul>
      <button
        type="button"
        disabled={disabled}
        className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled ? "Em breve" : "Assinar"}
      </button>
    </article>
  );
}
