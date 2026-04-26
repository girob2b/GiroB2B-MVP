"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Menu, X, Lock } from "lucide-react";
import { GiroLogo } from "@/components/ui/giro-logo";
import { cn } from "@/lib/utils";

const publicNav = [
  { href: "/explorar", label: "Explorar", icon: Search },
];

function Sidebar({
  mobile = false,
  onClose,
  pathname,
}: {
  mobile?: boolean;
  onClose: () => void;
  pathname: string;
}) {
  return (
    <aside
      className={cn(
        "flex flex-col bg-white border-r border-border",
        mobile
          ? "w-72 h-full"
          : "hidden md:flex w-64 h-screen sticky top-0 overflow-hidden"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border shrink-0">
        <Link
          href="/"
          aria-label="GiroB2B"
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <GiroLogo size={32} iconOnly />
          <span className="font-bold text-lg tracking-tight text-slate-900 truncate">
            GiroB2B
          </span>
        </Link>
        {mobile && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto" aria-label="Navegação">
        <div className="space-y-0.5">
          {publicNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    active && "text-[color:var(--brand-green-600)]"
                  )}
                />
                {label}
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[color:var(--brand-green-500)]" />
                )}
              </Link>
            );
          })}
        </div>

        {/* CTA único pra logar — substitui os 3 items cadeados que confundiam */}
        <div className="mt-4 mx-2 rounded-xl border border-brand-100 bg-brand-50 p-3">
          <p className="text-xs font-semibold text-brand-900 mb-1.5 flex items-center gap-1.5">
            <Lock className="w-3 h-3 shrink-0" />
            Disponível após entrar
          </p>
          <p className="text-[11px] leading-relaxed text-brand-800/80 mb-2.5">
            Painel, produtos e suas cotações.
          </p>
          <Link
            href="/login"
            onClick={onClose}
            className="block text-center text-xs font-semibold text-brand-700 hover:text-brand-900 underline-offset-2 hover:underline"
          >
            Entrar →
          </Link>
        </div>
      </nav>

      {/* Footer — CTAs de autenticação + links legais */}
      <div className="px-3 py-4 border-t border-border space-y-2">
        <Link
          href="/cadastro"
          className="flex w-full items-center justify-center px-4 py-2.5 text-sm font-semibold bg-[color:var(--brand-green-600)] text-white rounded-lg hover:bg-[color:var(--brand-green-700)] transition-colors"
        >
          Criar conta gratuita
        </Link>
        <Link
          href="/login"
          className="flex w-full items-center justify-center px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          Já tenho conta
        </Link>
        <div className="flex items-center justify-center gap-3 pt-2 text-[11px] text-muted-foreground/70">
          <Link href="/termos" className="hover:text-muted-foreground hover:underline">Termos</Link>
          <span>·</span>
          <Link href="/privacidade" className="hover:text-muted-foreground hover:underline">Privacidade</Link>
          <span>·</span>
          <Link href="/faq" className="hover:text-muted-foreground hover:underline">FAQ</Link>
        </div>
      </div>
    </aside>
  );
}

export default function GuestShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar desktop */}
      <Sidebar pathname={pathname} onClose={() => setMobileOpen(false)} />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 z-50">
            <Sidebar mobile pathname={pathname} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0">
        {/* Topbar mobile */}
        <header className="h-16 flex items-center px-4 bg-white border-b border-border md:hidden sticky top-0 z-30 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/" aria-label="GiroB2B" className="mx-auto">
            <GiroLogo size={28} iconOnly />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-[color:var(--brand-green-600)] text-white hover:bg-[color:var(--brand-green-700)] transition-colors"
            >
              Criar conta
            </Link>
          </div>
        </header>

        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
