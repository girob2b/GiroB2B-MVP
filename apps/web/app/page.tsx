import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicNavbar } from "@/components/layout/public-navbar";
import {
  Search,
  Package,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  Store,
} from "lucide-react";

const CATEGORIAS_DESTAQUE = [
  { slug: "embalagens",             nome: "Embalagens",           emoji: "📦" },
  { slug: "alimentos-bebidas",      nome: "Alimentos e Bebidas",  emoji: "🍞" },
  { slug: "materiais-construcao",   nome: "Construção",           emoji: "🏗️" },
  { slug: "textil-confeccao",       nome: "Têxtil",               emoji: "🧵" },
  { slug: "tecnologia",             nome: "Tecnologia",           emoji: "💻" },
  { slug: "agronegocio",            nome: "Agronegócio",          emoji: "🌾" },
  { slug: "limpeza-higiene",        nome: "Limpeza e Higiene",    emoji: "🧹" },
  { slug: "autopecas",              nome: "Autopeças",            emoji: "🔧" },
  { slug: "industria-manufatura",   nome: "Indústria",            emoji: "🏭" },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(user);
  const onboardingComplete = user?.user_metadata?.onboarding_complete === true;

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar isLoggedIn={isLoggedIn && onboardingComplete} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[color:var(--brand-green-50)] via-white to-slate-50 pt-16 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-[color:var(--brand-green-100)] text-[color:var(--brand-green-700)] text-sm font-semibold px-4 py-1.5 rounded-full">
            <Store className="w-4 h-4" />
            Marketplace B2B brasileiro
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
            Encontre fornecedores
            <span className="text-[color:var(--brand-green-600)]"> para o seu negócio</span>
          </h1>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Conectamos compradores a fornecedores B2B de todo o Brasil.
            Explore produtos, solicite cotações e feche negócios — tudo em um só lugar.
          </p>

          {/* Search bar */}
          <form action="/explorar" method="GET" className="flex gap-2 max-w-xl mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                name="q"
                placeholder="Embalagens, parafusos, tecidos..."
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)] focus:border-transparent shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="h-12 px-6 rounded-xl bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] text-white font-semibold text-sm transition-colors shadow-sm flex-shrink-0"
            >
              Buscar
            </button>
          </form>

          <p className="text-sm text-slate-500">
            Explore à vontade — conta só é necessária para enviar cotações
          </p>
        </div>
      </section>

      {/* ── Categorias ───────────────────────────────────────────────────── */}
      <section className="py-14 px-4 border-b border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-900">Segmentos em destaque</h2>
            <Link
              href="/explorar"
              className="text-sm text-[color:var(--brand-green-600)] hover:text-[color:var(--brand-green-700)] font-medium flex items-center gap-1"
            >
              Ver tudo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-3">
            {CATEGORIAS_DESTAQUE.map((c) => (
              <Link
                key={c.slug}
                href={`/explorar?categoria=${c.slug}`}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-slate-200 bg-white hover:border-[color:var(--brand-green-300)] hover:bg-[color:var(--brand-green-50)] transition-colors group text-center"
              >
                <span className="text-2xl">{c.emoji}</span>
                <span className="text-xs font-medium text-slate-700 group-hover:text-[color:var(--brand-green-700)] leading-tight">
                  {c.nome}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">Como funciona</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[color:var(--brand-green-100)] flex items-center justify-center mx-auto">
                <Search className="w-7 h-7 text-[color:var(--brand-green-600)]" />
              </div>
              <h3 className="font-bold text-slate-900">1. Explore livremente</h3>
              <p className="text-sm text-slate-600">
                Navegue por fornecedores e produtos de todo o Brasil sem precisar criar conta.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[color:var(--brand-green-100)] flex items-center justify-center mx-auto">
                <MessageSquare className="w-7 h-7 text-[color:var(--brand-green-600)]" />
              </div>
              <h3 className="font-bold text-slate-900">2. Solicite cotações</h3>
              <p className="text-sm text-slate-600">
                Encontrou o fornecedor certo? Crie sua conta grátis e envie sua proposta em minutos.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[color:var(--brand-green-100)] flex items-center justify-center mx-auto">
                <Package className="w-7 h-7 text-[color:var(--brand-green-600)]" />
              </div>
              <h3 className="font-bold text-slate-900">3. Feche negócios</h3>
              <p className="text-sm text-slate-600">
                Negocie diretamente com o fornecedor pelo chat integrado e finalize o pedido.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA fornecedores ─────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-[color:var(--brand-green-600)]">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Você é fornecedor?
          </h2>
          <p className="text-[color:var(--brand-green-100)] max-w-xl mx-auto">
            Liste seus produtos gratuitamente e receba pedidos de cotação de compradores qualificados de todo o Brasil.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/cadastro"
              className="h-12 px-8 rounded-xl bg-white text-[color:var(--brand-green-700)] hover:bg-[color:var(--brand-green-50)] font-bold text-sm transition-colors flex items-center justify-center"
            >
              Cadastrar empresa grátis
            </Link>
            <Link
              href="/explorar"
              className="h-12 px-8 rounded-xl border border-white/40 text-white hover:bg-white/10 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              Explorar plataforma
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer mínimo ────────────────────────────────────────────────── */}
      <footer className="py-8 px-4 border-t border-slate-200">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} GiroB2B — Marketplace B2B brasileiro</span>
          <div className="flex items-center gap-6">
            <Link href="/explorar" className="hover:text-slate-900 transition-colors">Explorar</Link>
            <Link href="/cadastro" className="hover:text-slate-900 transition-colors">Criar conta</Link>
            <Link href="/login" className="hover:text-slate-900 transition-colors">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
