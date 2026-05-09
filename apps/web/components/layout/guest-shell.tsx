"use client";

import Link from "next/link";
import { Search, Plus, LayoutGrid } from "lucide-react";
import { GiroLogo } from "@/components/ui/giro-logo";

export default function GuestShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Topbar desktop */}
      <header className="hidden md:block bg-white border-b border-border sticky top-0 z-30 shrink-0">
        <div className="mx-auto max-w-7xl h-16 flex items-center gap-4 px-6">
          <Link href="/" aria-label="GiroB2B" className="shrink-0">
            <GiroLogo size={32} />
          </Link>

          <Link
            href="/buscar"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <LayoutGrid className="h-4 w-4 text-slate-500" />
            Categorias
          </Link>

          <form action="/buscar" method="get" className="flex-1 max-w-xl">
            <label htmlFor="topbar-q" className="sr-only">Buscar necessidades</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="topbar-q"
                name="q"
                placeholder="Buscar necessidades por produto, categoria ou especificação..."
                className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm focus:bg-white focus:border-[color:var(--brand-green-400)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-200)]"
              />
            </div>
          </form>

          <nav className="flex items-center gap-2 shrink-0">
            <Link
              href="/cadastro?next=/painel/postar"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[color:var(--brand-green-600)] text-white hover:bg-[color:var(--brand-green-700)] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Publicar necessidade
            </Link>
            <Link
              href="/seja-vendedor"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Sou vendedor
            </Link>
            <Link
              href="?auth=login"
              scroll={false}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      {/* Topbar mobile */}
      <header className="md:hidden bg-white border-b border-border sticky top-0 z-30 shrink-0">
        <div className="mx-auto max-w-7xl">
          <div className="h-16 flex items-center px-4 gap-3">
            <Link href="/" aria-label="GiroB2B" className="mr-auto">
              <GiroLogo size={28} iconOnly />
            </Link>
            <Link
              href="?auth=login"
              scroll={false}
              className="text-sm font-medium text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro?next=/painel/postar"
              className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg bg-[color:var(--brand-green-600)] text-white hover:bg-[color:var(--brand-green-700)] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Publicar
            </Link>
          </div>
          <form action="/buscar" method="get" className="px-4 pb-3">
            <label htmlFor="mobile-q" className="sr-only">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="mobile-q"
                name="q"
                placeholder="Buscar necessidades..."
                className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm focus:bg-white focus:border-[color:var(--brand-green-400)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-200)]"
              />
            </div>
          </form>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
