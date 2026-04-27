"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, Menu, X, Lock, FileText, KanbanSquare, MessageSquare, Package,
} from "lucide-react";
import { GiroLogo } from "@/components/ui/giro-logo";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Search;
  /** Se true, clicar não navega — redireciona pra /login com toast informando. */
  locked?: boolean;
};

const publicNav: NavItem[] = [
  { href: "/explorar",          label: "Explorar",          icon: Search },
  { href: "/painel/inquiries",  label: "Cotações",          icon: FileText,      locked: true },
  { href: "/painel/pipeline",   label: "Pipeline",          icon: KanbanSquare,  locked: true },
  { href: "/painel/chat",       label: "Chat",              icon: MessageSquare, locked: true },
  { href: "/painel/produtos",   label: "Material de venda", icon: Package,       locked: true },
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
  const router = useRouter();

  function handleLockedClick(e: React.MouseEvent, label: string) {
    e.preventDefault();
    toast.info(`Crie uma conta ou faça login pra acessar "${label}".`);
    onClose();
    router.push("/login");
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-brand-600",
        mobile ? "w-72 h-full" : "hidden md:flex w-64 h-screen sticky top-0",
      )}
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Logo */}
        <div className="h-20 flex items-center px-4 border-b border-brand-700 shrink-0">
          <Link href="/" aria-label="GiroB2B" className="flex items-center min-w-0 flex-1">
            <GiroLogo size={40} iconOnly />
            <span className="ml-2.5 font-bold text-lg tracking-tight text-white truncate">GiroB2B</span>
          </Link>
          {mobile && (
            <button onClick={onClose} className="text-white/70 hover:text-white p-1" aria-label="Fechar menu">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto" aria-label="Menu principal">
          <div className="space-y-0.5">
            {publicNav.map(({ href, label, icon: Icon, locked }) => {
              const active = !locked && (pathname === href || pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={locked ? "/login" : href}
                  onClick={(e) => {
                    if (locked) handleLockedClick(e, label);
                    else onClose();
                  }}
                  aria-disabled={locked}
                  title={locked ? `Entre na sua conta pra acessar ${label}` : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors px-3 py-2.5",
                    locked
                      ? "text-white/40 hover:bg-white/5 hover:text-white/60 cursor-pointer"
                      : active
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {locked && <Lock className="w-3 h-3 shrink-0 text-white/40" />}
                  {active && !locked && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Footer — CTAs de autenticação + links legais (mesmo estilo escuro) */}
      <div className="px-3 py-4 border-t border-brand-700 space-y-2">
        <Link
          href="/cadastro"
          onClick={onClose}
          className="flex w-full items-center justify-center px-4 py-2.5 text-sm font-semibold bg-white text-brand-700 rounded-lg hover:bg-white/90 transition-colors"
        >
          Criar conta gratuita
        </Link>
        <Link
          href="/login"
          onClick={onClose}
          className="flex w-full items-center justify-center px-4 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          Já tenho conta
        </Link>
        <div className="flex items-center justify-center gap-3 pt-2 text-[11px] text-white/40">
          <Link href="/termos" className="hover:text-white/70 hover:underline">Termos</Link>
          <span>·</span>
          <Link href="/privacidade" className="hover:text-white/70 hover:underline">Privacidade</Link>
          <span>·</span>
          <Link href="/faq" className="hover:text-white/70 hover:underline">FAQ</Link>
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
      <Sidebar pathname={pathname} onClose={() => setMobileOpen(false)} />

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
