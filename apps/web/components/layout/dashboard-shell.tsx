"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Search, Eye, ClipboardList, Plus, Inbox, IdCard,
  Menu, X, LogOut, ChevronDown,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GiroLogo } from "@/components/ui/giro-logo";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserInfo {
  id: string;
  email: string;
  role: string;
  fullName?: string;
}

interface SupplierInfo {
  id: string;
  trade_name: string;
  company_name?: string | null;
  logo_url: string | null;
  plan: string;
  profile_completeness: number;
  slug: string;
  city?: string | null;
  state?: string | null;
}

interface BuyerInfo {
  id: string;
  name: string;
}

interface DashboardShellProps {
  children: React.ReactNode;
  user: UserInfo;
  supplier?: SupplierInfo | null;
  buyer?: BuyerInfo | null;
  /** True quando o user pode usar a plataforma sem nudge de "complete cadastro". */
  cadastroCompleto?: boolean;
  /** Compatibilidade com chamadas antigas — não tem mais sidebar pra colapsar. */
  initialCollapsed?: boolean;
}

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
}

// ─── Nav definitions (PIVOT 2026-05-07) ──────────────────────────────────────
// Topbar inline. Sem agrupamento por seção — é tudo flat.
//   - Cadastro incompleto → só Explorar
//   - buyer-only          → Explorar, Publicar, Necessidades, Dashboard
//   - supplier-only       → Leads, Material de venda, Perfil público, Dashboard
//   - both                → Explorar, Publicar, Necessidades, Leads, Material de venda, Perfil público, Dashboard

function minimalNav(): NavLink[] {
  return [{ href: "/painel/explorar", label: "Explorar", icon: Search }];
}

function buyerNav(): NavLink[] {
  return [
    { href: "/painel/explorar",     label: "Explorar",     icon: Search },
    { href: "/painel/postar",       label: "Publicar",     icon: Plus },
    { href: "/painel/necessidades", label: "Necessidades", icon: ClipboardList },
    { href: "/painel/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  ];
}

function supplierNav(): NavLink[] {
  return [
    { href: "/painel/leads",          label: "Leads",             icon: Inbox },
    { href: "/painel/produtos",       label: "Material de venda", icon: Package },
    { href: "/painel/perfil-publico", label: "Perfil público",    icon: Eye },
    { href: "/painel/dashboard",      label: "Dashboard",         icon: LayoutDashboard },
  ];
}

function bothNav(): NavLink[] {
  return [
    { href: "/painel/explorar",       label: "Explorar",          icon: Search },
    { href: "/painel/postar",         label: "Publicar",          icon: Plus },
    { href: "/painel/necessidades",   label: "Necessidades",      icon: ClipboardList },
    { href: "/painel/leads",          label: "Leads",             icon: Inbox },
    { href: "/painel/produtos",       label: "Material de venda", icon: Package },
    { href: "/painel/perfil-publico", label: "Perfil público",    icon: Eye },
    { href: "/painel/dashboard",      label: "Dashboard",         icon: LayoutDashboard },
  ];
}

const ROLE_LABELS: Record<string, string> = {
  buyer: "Comprador",
  supplier: "Vendedor",
  both: "Ambos",
};

// ─── Account dropdown ────────────────────────────────────────────────────────

function AccountDropdown({
  user,
  displayName,
  avatarSrc,
  avatarFallback,
  roleLabel,
}: {
  user: UserInfo;
  displayName: string;
  avatarSrc?: string;
  avatarFallback: string;
  roleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors"
      >
        <Avatar className="w-8 h-8 border border-slate-200">
          <AvatarImage src={avatarSrc} alt={displayName} />
          <AvatarFallback className="bg-[color:var(--brand-green-100)] text-[color:var(--brand-green-700)] text-xs font-bold">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
        <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 min-w-[260px] rounded-2xl border border-slate-200 bg-white shadow-xl py-2 z-50">
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
                <p className="text-[10px] font-bold text-[color:var(--brand-green-600)] uppercase tracking-wider truncate mb-0.5">
                  {roleLabel}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <Link
            href="/painel/perfil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <IdCard className="w-4 h-4 text-slate-400 shrink-0" />
            Meu perfil
          </Link>

          <div className="my-1 border-t border-slate-100" />

          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Mobile drawer ────────────────────────────────────────────────────────────

function MobileDrawer({
  open,
  onClose,
  navItems,
  pathname,
  displayName,
  email,
  roleLabel,
  avatarSrc,
  avatarFallback,
}: {
  open: boolean;
  onClose: () => void;
  navItems: NavLink[];
  pathname: string;
  displayName: string;
  email: string;
  roleLabel: string;
  avatarSrc?: string;
  avatarFallback: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="Fechar menu"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl flex flex-col">
        <header className="h-16 flex items-center px-4 border-b border-slate-100 shrink-0">
          <Link href="/painel" onClick={onClose} className="mr-auto">
            <GiroLogo size={28} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </header>

        <div className="px-4 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 shrink-0 border border-slate-100">
              <AvatarImage src={avatarSrc} alt={displayName} />
              <AvatarFallback className="bg-[color:var(--brand-green-100)] text-[color:var(--brand-green-700)] font-bold text-sm">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
              <p className="text-[10px] font-bold text-[color:var(--brand-green-600)] uppercase tracking-wider truncate">
                {roleLabel}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/painel" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)]"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                {label}
              </Link>
            );
          })}
          <div className="my-2 border-t border-slate-100" />
          <Link
            href="/painel/perfil"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
          >
            <IdCard className="w-4 h-4 text-slate-400 shrink-0" />
            Meu perfil
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sair
            </button>
          </form>
        </nav>
      </aside>
    </div>
  );
}

// ─── Main shell ──────────────────────────────────────────────────────────────

export default function DashboardShell({
  children,
  user,
  supplier,
  buyer,
  cadastroCompleto = true,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: NavLink[] =
    !cadastroCompleto ? minimalNav() :
    user.role === "both" ? bothNav() :
    user.role === "supplier" ? supplierNav() :
    buyerNav();

  const displayName =
    user.role === "supplier" ? (supplier?.trade_name ?? user.email) :
    user.role === "buyer" ? (buyer?.name ?? user.email) :
    (supplier?.trade_name ?? buyer?.name ?? user.email);

  const avatarSrc = supplier?.logo_url ?? undefined;
  const avatarFallback = displayName.charAt(0).toUpperCase();
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Topbar desktop */}
      <header className="hidden md:flex h-16 items-center gap-4 px-6 bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
        <Link href="/painel" aria-label="GiroB2B" className="shrink-0 flex items-center gap-2">
          <GiroLogo size={32} iconOnly />
          <span className="font-bold text-base text-slate-900 hidden xl:inline">GiroB2B</span>
        </Link>

        <nav className="flex-1 flex items-center gap-1 overflow-x-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/painel" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  active
                    ? "bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)]"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon className="h-4 w-4 text-slate-400" />
                {label}
              </Link>
            );
          })}
        </nav>

        <AccountDropdown
          user={user}
          displayName={displayName}
          avatarSrc={avatarSrc}
          avatarFallback={avatarFallback}
          roleLabel={roleLabel}
        />
      </header>

      {/* Topbar mobile */}
      <header className="md:hidden h-16 flex items-center px-4 gap-3 bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="text-slate-500 hover:text-slate-900 p-1"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link href="/painel" aria-label="GiroB2B" className="mr-auto">
          <GiroLogo size={28} iconOnly />
        </Link>
        <Avatar className="w-8 h-8 border border-slate-200">
          <AvatarImage src={avatarSrc} alt={displayName} />
          <AvatarFallback className="bg-[color:var(--brand-green-100)] text-[color:var(--brand-green-700)] text-xs font-bold">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
      </header>

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        navItems={navItems}
        pathname={pathname}
        displayName={displayName}
        email={user.email}
        roleLabel={roleLabel}
        avatarSrc={avatarSrc}
        avatarFallback={avatarFallback}
      />

      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
