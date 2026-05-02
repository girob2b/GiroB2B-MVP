"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, LogOut, Users, FileText } from "lucide-react";
import { adminLogout } from "@/lib/actions/admin-auth";
import { GiroLogo } from "@/components/ui/giro-logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/cotacoes", label: "Cotações", icon: FileText },
  { href: "/admin/needs", label: "Necessidades", icon: ClipboardList },
];

export default function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden md:flex flex-col w-56 h-screen sticky top-0 bg-slate-900">
        <div className="h-16 flex items-center px-4 border-b border-slate-800">
          <Link href="/admin" className="flex items-center gap-2">
            <GiroLogo size={28} iconOnly />
            <span className="text-sm font-bold text-white">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-white/15 text-white"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-3 border-t border-slate-800 space-y-1">
          <p className="px-3 text-xs text-slate-500 truncate">{email}</p>
          <form action={adminLogout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6 md:p-8">{children}</main>
    </div>
  );
}

