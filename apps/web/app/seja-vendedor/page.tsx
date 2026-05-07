import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, MessageCircle, Target, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Seja vendedor — receba leads B2B qualificados",
  description:
    "No GiroB2B, compradores publicam o que precisam comprar. Vendedores assinantes contatam direto pelo WhatsApp.",
};

export default function SejaVendedorPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[color:var(--brand-green-50)] to-white p-8 sm:p-12">
        <div className="max-w-3xl space-y-4">
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
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link
              href="/cadastro?role=supplier"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-green-600)] px-6 py-3 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)]"
            >
              Quero vender no GiroB2B <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/buscar"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver necessidades publicadas
            </Link>
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

      {/* Planos placeholder */}
      <section className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">Planos</h2>
          <p className="text-sm text-slate-500">
            Os preços finais estão sendo trancados. Cadastre-se agora — entraremos em contato assim que
            os planos forem publicados.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <PlanCard tier="Inicial" tagline="Para quem está testando o canal" disabled>
            <li>Acesso ao feed completo de leads</li>
            <li>Contato via WhatsApp com mensagem pronta</li>
            <li>Sem taxa por venda — só assinatura</li>
          </PlanCard>
          <PlanCard tier="Profissional" tagline="Para quem fecha negócio recorrente" highlight disabled>
            <li>Tudo do Inicial</li>
            <li>Filtro avançado por palavra-chave</li>
            <li>Histórico de contatos próprios</li>
          </PlanCard>
          <PlanCard tier="Empresarial" tagline="Para times comerciais maiores" disabled>
            <li>Tudo do Profissional</li>
            <li>Múltiplos usuários por conta</li>
            <li>Suporte direto da equipe</li>
          </PlanCard>
        </div>
      </section>

      {/* CTA final */}
      <section className="rounded-3xl bg-slate-900 px-8 py-10 text-white sm:px-12">
        <div className="max-w-2xl space-y-4">
          <Zap className="h-8 w-8 text-[color:var(--brand-accent-300)]" />
          <h2 className="text-2xl font-bold">Pronto pra ver leads reais?</h2>
          <p className="text-slate-300">
            O cadastro é rápido. Entraremos em contato com você assim que os planos forem publicados —
            até lá, você pode explorar o feed em modo preview.
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link
              href="/cadastro?role=supplier"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Cadastrar como vendedor <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/buscar"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Ver feed em preview
            </Link>
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
  tagline,
  highlight,
  disabled,
  children,
}: {
  tier: string;
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
        <h3 className="text-lg font-bold text-slate-900">{tagline}</h3>
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
