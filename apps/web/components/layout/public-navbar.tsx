"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GiroLogo } from "@/components/ui/giro-logo";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicNavbarProps {
  /** Se passado, exibe estado de usuário logado com link para o painel */
  isLoggedIn?: boolean;
}

const NAV_LINKS = [
  { href: "/explorar", label: "Explorar" },
  { href: "/fornecedores", label: "Fornecedores" },
];

export function PublicNavbar({ isLoggedIn = false }: PublicNavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <GiroLogo />
        </Link>

        {/* Nav links (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                pathname === href
                  ? "text-[color:var(--brand-green-700)] bg-[color:var(--brand-green-50)]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search shortcut (mobile) */}
          <Link
            href="/explorar"
            className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Explorar"
          >
            <Search className="w-5 h-5" />
          </Link>

          {isLoggedIn ? (
            <Link
              href="/painel"
              className="h-9 px-4 rounded-xl bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] text-white text-sm font-semibold transition-colors flex items-center"
            >
              Meu painel
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="h-9 px-4 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-sm font-medium transition-colors hidden sm:flex items-center"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="h-9 px-4 rounded-xl bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] text-white text-sm font-semibold transition-colors flex items-center"
              >
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
