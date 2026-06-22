"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Store } from "lucide-react";
import { GiroLogo } from "@/components/ui/giro-logo";
import { SiteFooter } from "@/components/layout/site-footer";
import { HeaderSearch } from "@/components/layout/header-search";

/**
 * Shell único para todas as páginas públicas do app.
 *
 * Decisão 2026-06-22 (#16 unificar-shells-publicos):
 * - PublicShell e public-navbar.tsx removidos. GuestShell é o único shell público.
 * - Footer institucional/SEO adicionado (SiteFooter).
 *
 * Decisão 2026-06-22 (ajuste-header-search):
 * - Link "Ver demandas" (LayoutGrid) removido — Vitor: "feio e sem sentido".
 * - Substituído por barra de busca centralizada e proeminente (HeaderSearch).
 *   Desktop: barra inline entre logo e ações (max-w-lg, flex-1).
 *   Mobile: ícone lupa que expande pra barra full-width abaixo do topbar.
 * - Submit por Enter ou clique na lupa → /buscar?q=<query> (sem busca realtime).
 *
 * Decisão de produto 2026-05-23 (UX contextual, PR #3):
 * - Em /postar (o user já está postando), esconde "Publicar demanda" do
 *   header — botão seria redundante. Mostra "Criar conta" + "Entrar" pra
 *   converter quem ainda não tem conta.
 *
 * Decisão 2026-05-24 (PR #7):
 * - "Sou vendedor" aparece APENAS na tela raiz (`/`). Em outras rotas (postar,
 *   cadastro, etc) fica fora pra não distrair do contexto do comprador.
 */
export default function GuestShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onPostar = pathname?.startsWith("/postar") ?? false;
  const onRoot = pathname === "/";

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Topbar desktop */}
      <header className="hidden md:block bg-brand-600 sticky top-0 z-30 shrink-0">
        <div className="mx-auto max-w-7xl h-16 flex items-center px-6">
          {/* Logo — variante on-brand: ícone teal com anel dourado + texto branco */}
          <Link href="/" aria-label="GiroB2B" className="shrink-0 mr-4">
            <GiroLogo size={32} variant="on-brand" />
          </Link>

          {/* Barra de busca centralizada — elemento de maior peso no header */}
          <HeaderSearch />

          {/* Ações do usuário — lado direito */}
          <nav className="flex items-center gap-2 shrink-0 ml-4" aria-label="Ações do usuário">
            {onPostar ? (
              <>
                <Link
                  href="?auth=login"
                  scroll={false}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="?auth=register"
                  scroll={false}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-gold-500 text-neutral-900 hover:bg-gold-600 transition-colors"
                >
                  Criar conta
                </Link>
              </>
            ) : (
              <>
                {/* Botão "Publicar demanda" — dourado CLARO (accent-500 #C08A2E) com texto
                    branco, por preferência visual do Vitor (mais claro + destaque). Trade-off:
                    branco/accent-500 ~4.08:1 — abaixo do AA estrito pra texto normal, mas é
                    label em negrito e legível. Pra AA estrito com branco precisaria gold-700. */}
                <Link
                  href="/postar"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gold-500 text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.45)] hover:bg-gold-600 transition-colors"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Publicar demanda
                </Link>
                {onRoot && (
                  <Link
                    href="/seja-vendedor"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
                  >
                    <Store className="h-4 w-4 text-white/60" aria-hidden="true" />
                    Sou vendedor
                  </Link>
                )}
                <Link
                  href="?auth=login"
                  scroll={false}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
                >
                  Entrar
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Topbar mobile — sticky já cria contexto de posicionamento; filhos absolute se ancoram aqui */}
      <header className="md:hidden bg-brand-600 sticky top-0 z-30 shrink-0">
        <div className="mx-auto max-w-7xl">
          <div className="h-16 flex items-center px-4 gap-2">
            <Link href="/" aria-label="GiroB2B" className="mr-auto shrink-0">
              {/* iconOnly: ícone teal com anel dourado; sem wordmark pra poupar espaço */}
              <GiroLogo size={28} iconOnly />
            </Link>
            {onPostar ? (
              <>
                <Link
                  href="?auth=login"
                  scroll={false}
                  className="text-sm font-medium text-white/90 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="?auth=register"
                  scroll={false}
                  className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-gold-500 text-neutral-900 hover:bg-gold-600 transition-colors"
                >
                  Criar conta
                </Link>
              </>
            ) : (
              <>
                {onRoot && (
                  <Link
                    href="/seja-vendedor"
                    className="text-sm font-medium text-white/90 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Sou vendedor
                  </Link>
                )}
                {/* Barra de busca mobile — ícone lupa que expande; passa variante on-brand */}
                <HeaderSearch headerVariant="on-brand" />
                <Link
                  href="?auth=login"
                  scroll={false}
                  className="text-sm font-medium text-white/90 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/postar"
                  className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg bg-gold-500 text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.45)] hover:bg-gold-600 transition-colors"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Publicar
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}
