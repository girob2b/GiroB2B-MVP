"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, MessageSquare, User, LogOut,
  ExternalLink, Globe, Menu, X, Search, Scale,
  PanelLeftClose, PanelLeftOpen, Settings, CreditCard, ChevronUp,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GiroLogo } from "@/components/ui/giro-logo";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserInfo   { id: string; email: string; role: string }
interface SupplierInfo {
  id: string; trade_name: string; logo_url: string | null;
  plan: string; profile_completeness: number; slug: string;
}
interface BuyerInfo  { id: string; name: string }

interface DashboardShellProps {
  children: React.ReactNode;
  user: UserInfo;
  supplier?: SupplierInfo | null;
  buyer?: BuyerInfo | null;
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

const NAV_SECTIONS_BUYER: NavSection[] = [
  { items: [
    { href: "/painel",            label: "Início",         icon: LayoutDashboard },
    { href: "/painel/explorar",   label: "Explorar",       icon: Search },
    { href: "/painel/comparador", label: "Comparador",     icon: Scale },
    { href: "/painel/chat",       label: "Chat",           icon: MessageSquare },
  ]},
];

const NAV_SECTIONS_SUPPLIER: NavSection[] = [
  { items: [
    { href: "/painel",            label: "Início",         icon: LayoutDashboard },
    { href: "/painel/produtos",   label: "Meus Produtos",  icon: Package },
    { href: "/painel/catalogo",   label: "Catálogo",       icon: Globe },
    { href: "/painel/meu-perfil", label: "Meu Perfil",     icon: User },
    { href: "/painel/chat",       label: "Chat de Vendas", icon: MessageSquare },
  ]},
];

const NAV_SECTIONS_BOTH: NavSection[] = [
  { items: [
    { href: "/painel", label: "Início", icon: LayoutDashboard },
  ]},
  { label: "Comprador", items: [
    { href: "/painel/explorar",   label: "Explorar",   icon: Search },
    { href: "/painel/comparador", label: "Comparador", icon: Scale },
    { href: "/painel/chat",       label: "Chat",       icon: MessageSquare },
  ]},
  { label: "Fornecedor", items: [
    { href: "/painel/produtos",   label: "Meus Produtos",  icon: Package },
    { href: "/painel/catalogo",   label: "Catálogo",       icon: Globe },
    { href: "/painel/meu-perfil", label: "Meu Perfil",     icon: User },
    { href: "/painel/chat-vendas", label: "Chat de Vendas", icon: MessageSquare },
  ]},
];

const ROLE_LABELS: Record<string, string> = {
  buyer: "Comprador", supplier: "Vendedor", both: "Ambos",
};


// ─── Sidebar — definida FORA do componente principal ─────────────────────────

function Sidebar({
  collapsed, mobile = false, onClose, onToggleCollapse,
  pathname, navSections, displayName, avatarSrc, avatarFallback,
  roleLabel, supplier, user,
}: SidebarProps) {
  const w = mobile ? "w-72" : collapsed ? "w-16" : "w-64";
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

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
        "flex flex-col bg-white border-r border-border transition-all duration-200",
        mobile ? `${w} h-full` : `hidden md:flex ${w} h-screen sticky top-0 overflow-hidden`
      )}
    >
      {/* Logo */}
      <div className={cn(
        "h-20 flex items-center border-b border-border shrink-0 transition-all duration-200",
        collapsed ? "px-0 justify-center" : "px-4"
      )}>
        <Link href="/painel" className={cn("flex items-center min-w-0", collapsed ? "justify-center" : "flex-1")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/icon.png" 
            alt="GiroB2B" 
            className={cn("object-contain transition-all", collapsed ? "h-8 w-8" : "h-10 w-auto")}
          />
          {!collapsed && (
            <span className="ml-2.5 font-bold text-lg tracking-tight text-slate-900 truncate">GiroB2B</span>
          )}
        </Link>
        
        {mobile && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1" aria-label="Fechar menu">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto" aria-label="Menu principal">
        {navSections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-4" : ""}>
            {/* Label da seção — só aparece quando collapsed=false e há label */}
            {section.label && !collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
                {section.label}
              </p>
            )}
            {/* Divisor entre seções — só quando collapsed */}
            {section.label && collapsed && si > 0 && (
              <div className="mx-2 mb-2 border-t border-border" />
            )}
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/painel" && pathname.startsWith(href));
                const isProfile = href === "/painel/meu-perfil";
                return (
                  <div key={href}>
                    <Link
                      href={href}
                      onClick={onClose}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                        active
                          ? "bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)]"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", active && "text-[color:var(--brand-green-600)]")} />
                      {!collapsed && (
                        <>
                          {label}
                          {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[color:var(--brand-green-500)]" />}
                        </>
                      )}
                    </Link>

                    {/* Sub-item: Ver perfil público — só quando "Meu Perfil" está ativo */}
                    {isProfile && active && !collapsed && supplier && user.role !== "buyer" && (
                      <Link
                        href={`/empresa/${supplier.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 ml-3 pl-4 pr-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-l-2 border-[color:var(--brand-green-200)]"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        Ver perfil público
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — account dropdown + toggle */}
      <div className="px-2 py-3 border-t border-border space-y-1" ref={accountRef}>
        {!mobile && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg text-sm text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-all",
              collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">Recolher menu</span>
              </>
            )}
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setAccountOpen(o => !o)}
            title={collapsed ? "Minha conta" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
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
            <div className={cn(
              "absolute bottom-full mb-2 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 min-w-[220px]",
              collapsed ? "left-full ml-2 bottom-0" : "left-0 right-0"
            )}>
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

              <Link
                href="/painel/configuracoes"
                onClick={() => setAccountOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-muted transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                Configurações
              </Link>
              <Link
                href="/painel/assinatura"
                onClick={() => setAccountOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-muted transition-colors"
              >
                <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                Assinatura
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

export default function DashboardShell({ children, user, supplier, buyer }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);

  const navSections =
    user.role === "both"     ? NAV_SECTIONS_BOTH :
    user.role === "supplier" ? NAV_SECTIONS_SUPPLIER :
    NAV_SECTIONS_BUYER;

  const displayName =
    user.role === "supplier" ? (supplier?.trade_name ?? user.email) :
    user.role === "buyer"    ? (buyer?.name ?? user.email) :
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
    onToggleCollapse: () => setCollapsed(c => !c),
  };

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      {/* Sidebar desktop */}
      <Sidebar {...sidebarProps} />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 z-50">
            <Sidebar {...sidebarProps} mobile />
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0">
        {/* Topbar mobile */}
        <header className="h-16 flex items-center px-4 bg-white border-b border-border md:hidden sticky top-0 z-30 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Abrir menu">
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/painel" className="mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/icon.png" 
              alt="GiroB2B" 
              className="h-7 w-7 object-contain"
            />
          </Link>
          <div className="w-8" />
        </header>

        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
