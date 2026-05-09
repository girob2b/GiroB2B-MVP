"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, Menu, X, Lock, Package, Plus, LayoutGrid,
  PanelLeftClose, LogIn, UserPlus,
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
  { href: "/painel/produtos",   label: "Material de venda", icon: Package, locked: true },
];

const SIDEBAR_COOKIE = "girob2b_sidebar";

function readSidebarCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some(c => c === `${SIDEBAR_COOKIE}=1`);
}

function writeSidebarCookie(collapsed: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=31536000; SameSite=Lax`;
}

function Sidebar({
  mobile = false,
  collapsed,
  onClose,
  onToggleCollapse,
  pathname,
}: {
  mobile?: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  pathname: string;
}) {
  const router = useRouter();

  function handleLockedClick(e: React.MouseEvent, label: string) {
    e.preventDefault();
    toast.info(`Crie uma conta ou faça login pra acessar "${label}".`);
    onClose();
    // Abre modal de login mantendo o user no contexto da página atual.
    router.push(`?auth=login`, { scroll: false });
  }

  const w = mobile ? "w-72" : collapsed ? "w-16" : "w-64";

  return (
    <aside
      className={cn(
        "flex flex-col bg-brand-600 transition-all duration-200",
        w,
        mobile ? "h-full" : "hidden md:flex h-screen sticky top-0",
      )}
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Logo + botão recolher (no topo) */}
        <div className={cn(
          "h-20 flex items-center border-b border-brand-700 shrink-0 transition-all duration-200",
          collapsed ? "px-0 justify-center" : "px-4",
        )}>
          {/* Quando colapsado, clicar na logo expande o menu (em vez de navegar). */}
          {!mobile && collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expandir menu"
              title="Expandir menu"
              className="flex items-center justify-center"
            >
              <GiroLogo size={32} iconOnly />
            </button>
          ) : (
            <Link href="/" aria-label="GiroB2B" className="flex items-center min-w-0 flex-1">
              <GiroLogo size={40} iconOnly />
              <span className="ml-2.5 font-bold text-lg tracking-tight text-white truncate">GiroB2B</span>
            </Link>
          )}

          {/* Botão recolher — só aparece quando aberto e desktop */}
          {!mobile && !collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Recolher menu"
              title="Recolher menu"
              className="ml-2 shrink-0 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}

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
                  title={collapsed ? label : locked ? `Entre na sua conta pra acessar ${label}` : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                    collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                    locked
                      ? "text-white/40 hover:bg-white/5 hover:text-white/60 cursor-pointer"
                      : active
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{label}</span>
                      {locked && <Lock className="w-3 h-3 shrink-0 text-white/40" />}
                      {active && !locked && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Footer — CTAs de autenticação (sem links legais; eles vivem na landing) */}
      <div className={cn(
        "border-t border-brand-700 space-y-2 transition-all duration-200",
        collapsed ? "px-2 py-3" : "px-3 py-4",
      )}>
        <Link
          href="?auth=register"
          scroll={false}
          onClick={onClose}
          title={collapsed ? "Criar conta gratuita" : undefined}
          className={cn(
            "flex w-full items-center justify-center text-sm font-semibold bg-white text-brand-700 rounded-lg hover:bg-white/90 transition-colors",
            collapsed ? "h-11" : "px-4 py-3.5",
          )}
        >
          {collapsed ? <UserPlus className="w-5 h-5" /> : "Criar conta gratuita"}
        </Link>
        <Link
          href="?auth=login"
          scroll={false}
          onClick={onClose}
          title={collapsed ? "Já tenho conta" : undefined}
          className={cn(
            "flex w-full items-center justify-center text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors",
            collapsed ? "h-11" : "px-4 py-3.5",
          )}
        >
          {collapsed ? <LogIn className="w-5 h-5" /> : "Já tenho conta"}
        </Link>
      </div>
    </aside>
  );
}

export default function GuestShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);

  // Hidrata o estado a partir do cookie no client (compartilhado com o dashboard).
  useEffect(() => {
    setCollapsed(readSidebarCookie());
  }, []);

  function toggleCollapse() {
    setCollapsed(c => {
      const next = !c;
      writeSidebarCookie(next);
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar
        pathname={pathname}
        collapsed={collapsed}
        onClose={() => setMobileOpen(false)}
        onToggleCollapse={toggleCollapse}
      />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 z-50">
            <Sidebar
              mobile
              collapsed={false}
              pathname={pathname}
              onClose={() => setMobileOpen(false)}
              onToggleCollapse={toggleCollapse}
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Topbar desktop (estilo marketplace) */}
        <header className="hidden md:flex h-16 items-center gap-4 px-6 bg-white border-b border-border sticky top-0 z-30 shrink-0">
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
        </header>

        {/* Topbar mobile */}
        <header className="md:hidden bg-white border-b border-border sticky top-0 z-30 shrink-0">
          <div className="h-16 flex items-center px-4 gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/" aria-label="GiroB2B" className="mr-auto">
              <GiroLogo size={28} iconOnly />
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
        </header>

        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
