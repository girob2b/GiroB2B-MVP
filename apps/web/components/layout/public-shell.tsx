import Link from "next/link";
import { GiroLogo } from "@/components/ui/giro-logo";

interface PublicShellProps {
  children: React.ReactNode;
}

export default function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="h-16 bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 md:px-8">
          <Link href="/" aria-label="GiroB2B" className="flex items-center gap-2 min-w-0">
            <GiroLogo size={32} iconOnly />
            <span className="font-bold text-lg tracking-tight text-slate-900 truncate">GiroB2B</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/explorar" className="hover:text-foreground transition-colors">
              Explorar
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="px-4 py-2 text-sm font-semibold bg-[color:var(--brand-green-600)] text-white rounded-lg hover:bg-[color:var(--brand-green-700)] transition-colors"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
