"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Store } from "lucide-react";
import { GiroLogo } from "@/components/ui/giro-logo";

/**
 * Topbar do app interno (visitante / comprador não-logado).
 *
 * Decisão de produto 2026-05-18:
 * - Sem busca/categorias no header — feed de necessidades é feature de vendedor
 *   aprovado, não pode ficar à mostra na raiz pra qualquer visitante.
 * - O app interno é o lado do comprador: publicar + entrar.
 *
 * Decisão 2026-05-23 (UX contextual, PR #3):
 * - Em /postar (o user já está postando), esconde "Publicar necessidade" do
 *   header — botão seria redundante. Mostra "Criar conta" + "Entrar" pra
 *   converter quem ainda não tem conta.
 *
 * Decisão 2026-05-24 (PR #7):
 * - "Sou vendedor" volta — APENAS na tela raiz (`/`). Em outras rotas (postar,
 *   cadastro, etc) fica fora pra não distrair do contexto do comprador.
 *   Click leva pra /seja-vendedor (landing pública que oferece waitlist +
 *   fluxo de cadastro pra quem foi aprovado pelo admin).
 */
export default function GuestShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onPostar = pathname?.startsWith("/postar") ?? false;
  // Só na raiz. /postar, /cadastro, /login etc não mostram o CTA de vendedor.
  const onRoot = pathname === "/";

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Topbar desktop */}
      <header className="hidden md:block bg-white border-b border-border sticky top-0 z-30 shrink-0">
        <div className="mx-auto max-w-7xl h-16 flex items-center justify-between px-6">
          <Link href="/" aria-label="GiroB2B" className="shrink-0">
            <GiroLogo size={32} />
          </Link>

          <nav className="flex items-center gap-2 shrink-0">
            {onPostar ? (
              <>
                <Link
                  href="?auth=login"
                  scroll={false}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="?auth=register"
                  scroll={false}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-[color:var(--brand-green-600)] text-white hover:bg-[color:var(--brand-green-700)] transition-colors"
                >
                  Criar conta
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/postar"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[color:var(--brand-green-600)] text-white hover:bg-[color:var(--brand-green-700)] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Publicar demanda
                </Link>
                {onRoot && (
                  <Link
                    href="/seja-vendedor"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Store className="h-4 w-4 text-slate-400" />
                    Sou vendedor
                  </Link>
                )}
                <Link
                  href="?auth=login"
                  scroll={false}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Entrar
                </Link>
              </>
            )}
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
            {onPostar ? (
              <>
                <Link
                  href="?auth=login"
                  scroll={false}
                  className="text-sm font-medium text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="?auth=register"
                  scroll={false}
                  className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-[color:var(--brand-green-600)] text-white hover:bg-[color:var(--brand-green-700)] transition-colors"
                >
                  Criar conta
                </Link>
              </>
            ) : (
              <>
                {onRoot && (
                  <Link
                    href="/seja-vendedor"
                    className="text-sm font-medium text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Sou vendedor
                  </Link>
                )}
                <Link
                  href="?auth=login"
                  scroll={false}
                  className="text-sm font-medium text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/postar"
                  className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg bg-[color:var(--brand-green-600)] text-white hover:bg-[color:var(--brand-green-700)] transition-colors"
                >
                  <Plus className="h-4 w-4" />
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
    </div>
  );
}
