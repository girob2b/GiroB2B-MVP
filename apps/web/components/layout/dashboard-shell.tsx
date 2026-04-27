"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, MessageSquare, FileText, KanbanSquare, User, LogOut,
  Menu, X, Search, Scale, Eye,
  PanelLeftClose, ChevronUp,
  IdCard, Loader2,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GiroLogo } from "@/components/ui/giro-logo";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/lib/features";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserInfo   { id: string; email: string; role: string; fullName?: string }
interface SupplierInfo {
  id: string; trade_name: string; company_name?: string | null;
  logo_url: string | null;
  plan: string; profile_completeness: number; slug: string;
  city?: string | null; state?: string | null;
}
interface BuyerInfo  { id: string; name: string }

interface DashboardShellProps {
  children: React.ReactNode;
  user: UserInfo;
  supplier?: SupplierInfo | null;
  buyer?: BuyerInfo | null;
  initialCollapsed?: boolean;
}

interface NavItem { href: string; label: string; icon: React.ElementType }
interface NavSection { label?: string; items: NavItem[] }

interface SidebarProps {
  collapsed: boolean;
  mobile?: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  pathname: string;
  navSections: NavSection[];
  displayName: string;
  avatarSrc?: string;
  avatarFallback: string;
  roleLabel: string;
  supplier?: SupplierInfo | null;
  user: UserInfo;
}

// ─── Nav definitions ──────────────────────────────────────────────────────────
// Itens não-MVP ficam atrás de FEATURES (lib/features.ts). Ao ligar a flag, voltam.

function buildBuyerNav(): NavSection[] {
  return [
    { items: [
      { href: "/painel", label: "Início", icon: LayoutDashboard },
    ]},
    { label: "Comprador", items: [
      { href: "/painel/explorar",   label: "Explorar",        icon: Search },
      { href: "/painel/inquiries",  label: "Minhas Cotações", icon: FileText },
      ...(FEATURES.pipeline   ? [{ href: "/painel/pipeline",   label: "Pipeline",        icon: KanbanSquare }] : []),
      ...(FEATURES.comparador ? [{ href: "/painel/comparador", label: "Comparador",      icon: Scale }] : []),
      ...(FEATURES.chat       ? [{ href: "/painel/chat",       label: "Chat de Compras", icon: MessageSquare }] : []),
    ]},
  ];
}

function buildSupplierNav(): NavSection[] {
  return [
    { items: [
      { href: "/painel",                label: "Início",            icon: LayoutDashboard },
      { href: "/painel/produtos",       label: "Material de venda", icon: Package },
      { href: "/painel/perfil-publico", label: "Perfil público",    icon: Eye },
      { href: "/painel/inquiries",      label: "Cotações",           icon: FileText },
      ...(FEATURES.pipeline ? [{ href: "/painel/pipeline", label: "Pipeline",       icon: KanbanSquare }] : []),
      ...(FEATURES.chat     ? [{ href: "/painel/chat",     label: "Chat de Vendas", icon: MessageSquare }] : []),
    ]},
  ];
}

function buildBothNav(): NavSection[] {
  return [
    { items: [
      { href: "/painel", label: "Início", icon: LayoutDashboard },
      ...(FEATURES.pipeline ? [{ href: "/painel/pipeline", label: "Pipeline",  icon: KanbanSquare }] : []),
      ...(FEATURES.chat     ? [{ href: "/painel/chat",     label: "Chat",      icon: MessageSquare }] : []),
    ]},
    { label: "Comprador", items: [
      { href: "/painel/explorar",   label: "Explorar",   icon: Search },
      { href: "/painel/inquiries",  label: "Cotações",   icon: FileText },
      ...(FEATURES.comparador ? [{ href: "/painel/comparador", label: "Comparador", icon: Scale }] : []),
    ]},
    { label: "Fornecedor", items: [
      { href: "/painel/produtos",       label: "Material de venda", icon: Package },
      { href: "/painel/perfil-publico", label: "Perfil público",    icon: Eye },
    ]},
  ];
}

const ROLE_LABELS: Record<string, string> = {
  buyer: "Comprador", supplier: "Vendedor", both: "Ambos",
};


// ─── Sidebar — definida FORA do componente principal ─────────────────────────

function Sidebar({
  collapsed, mobile = false, onClose, onToggleCollapse,
  pathname, navSections, displayName, avatarSrc, avatarFallback,
  roleLabel, user,
}: SidebarProps) {
  const w = mobile ? "w-72" : collapsed ? "w-16" : "w-64";
  const [accountOpen,  setAccountOpen]  = useState(false);
  const [pendingHref,  setPendingHref]  = useState<string | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Limpa pendingHref quando a navegação completa
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <aside
      className={cn(
        "flex flex-col bg-[color:var(--brand-primary-600)] transition-all duration-200",
        mobile ? `${w} h-full` : `hidden md:flex ${w} h-screen sticky top-0`
      )}
    >
      {/* Logo + Nav — overflow-hidden aqui para clipar texto durante a transição de colapso */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Logo + botão recolher (no topo) */}
        <div className={cn(
          "h-20 flex items-center border-b border-[color:var(--brand-primary-700)] shrink-0 transition-all duration-200",
          collapsed ? "px-0 justify-center" : "px-4"
        )}>
          {/* Quando colapsado, clicar na logo abre o menu (em vez de navegar). */}
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
            <Link
              href="/painel"
              aria-label="GiroB2B"
              className="flex items-center min-w-0 flex-1"
            >
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

          {/* X do mobile */}
          {mobile && (
            <button onClick={onClose} className="text-white/70 hover:text-white p-1" aria-label="Fechar menu">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto" aria-label="Menu principal">
          {navSections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-4" : ""}>
              {section.label && !collapsed && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/40 select-none">
                  {section.label}
                </p>
              )}
              {section.label && collapsed && si > 0 && (
                <div className="mx-2 mb-2 border-t border-white/20" />
              )}
              <div className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active  = pathname === href || (href !== "/painel" && pathname.startsWith(href));
                  const pending = pendingHref === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => { setPendingHref(href); onClose(); }}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                        active
                          ? "bg-white/15 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {pending
                        ? <Loader2 className="w-4 h-4 shrink-0 animate-spin text-white" />
                        : <Icon className="w-4 h-4 shrink-0" />
                      }
                      {!collapsed && (
                        <>
                          {label}
                          {active && !pending && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer — fora do overflow-hidden para o dropdown poder escapar lateralmente */}
      <div className="px-2 py-3 border-t border-[color:var(--brand-primary-700)] space-y-1" ref={accountRef}>
        <div className="relative">
            <button
              onClick={() => setAccountOpen(o => !o)}
              title={collapsed ? "Minha conta" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors",
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
              )}
            >
              <User className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">Minha conta</span>
                  <ChevronUp className={cn("w-3.5 h-3.5 shrink-0 transition-transform", accountOpen ? "rotate-0" : "rotate-180")} />
                </>
              )}
            </button>

            {/* Dropdown */}
            {accountOpen && (
              <div
                className={cn(
                  "absolute bottom-full mb-2 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 min-w-[220px]",
                  collapsed ? "left-full ml-2 bottom-0" : "left-0 right-0"
                )}
              >
                {/* User Info Header in Dropdown */}
                <div className="px-4 py-3 border-b border-slate-100 mb-1">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 shrink-0 border border-slate-100">
                      <AvatarImage src={avatarSrc} alt={displayName} />
                      <AvatarFallback className="bg-[color:var(--brand-green-100)] text-[color:var(--brand-green-700)] font-bold text-sm">
                        {avatarFallback}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                      <p className="text-[10px] font-bold text-[color:var(--brand-green-600)] uppercase tracking-wider truncate mb-0.5">{roleLabel}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* "Meu perfil" — rota única que se adapta ao role (buyer/supplier/both) */}
                <Link
                  href="/painel/perfil"
                  onClick={() => setAccountOpen(false)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-muted transition-colors"
                >
                  <IdCard className="w-4 h-4 text-slate-400 shrink-0" />
                  Meu perfil
                </Link>
                <div className="my-1 border-t border-border" />
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Sair
                  </button>
                </form>
              </div>
            )}
          </div>
      </div>

    </aside>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function hasConsent(): boolean {
  try {
    const raw = localStorage.getItem("girob2b.cookie-consent");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { updatedAt?: string };
    return !!parsed?.updatedAt;
  } catch {
    return false;
  }
}

function saveSidebarPref(collapsed: boolean) {
  if (!hasConsent()) return;
  document.cookie = `girob2b_sidebar=${collapsed ? "1" : "0"}; path=/; max-age=31536000; SameSite=Lax`;
}

export default function DashboardShell({ children, user, supplier, buyer, initialCollapsed = false }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(initialCollapsed);

  const navSections =
    user.role === "both"     ? buildBothNav() :
    user.role === "supplier" ? buildSupplierNav() :
    buildBuyerNav();

  const displayName =
    user.role === "supplier"   ? (supplier?.trade_name ?? user.email) :
    user.role === "buyer"      ? (buyer?.name ?? user.email) :
    (supplier?.trade_name ?? buyer?.name ?? user.email);

  const sidebarProps = {
    collapsed,
    pathname,
    navSections,
    displayName,
    avatarSrc:      supplier?.logo_url ?? undefined,
    avatarFallback: displayName.charAt(0).toUpperCase(),
    roleLabel:      ROLE_LABELS[user.role] ?? user.role,
    supplier,
    user,
    onClose:          () => setMobileOpen(false),
    onToggleCollapse: () => setCollapsed(c => {
      const next = !c;
      saveSidebarPref(next);
      return next;
    }),
  };

  return (
    <div className="flex min-h-screen bg-surface relative">
      {/* Sidebar desktop */}
      <Sidebar {...sidebarProps} />

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
            <Sidebar {...sidebarProps} mobile />
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0 flex flex-col h-screen">
        {/* Topbar mobile */}
        <header className="h-16 flex items-center px-4 bg-white border-b border-border md:hidden shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Abrir menu">
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/painel" aria-label="GiroB2B" className="mx-auto">
            <GiroLogo size={28} iconOnly />
          </Link>
          <div className="w-8" />
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
