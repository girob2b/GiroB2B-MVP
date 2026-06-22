import Link from "next/link";
import { Search, FileQuestion } from "lucide-react";
import GuestShell from "@/components/layout/guest-shell";

/**
 * 404 global — buyer-first.
 * CTA primário: publicar demanda (comprador) | secundário: explorar feed.
 * Mantém o usuário no funil em vez de devolver pro browser.
 */
export default function NotFound() {
  return (
    <GuestShell>
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4 py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-6">
          <FileQuestion className="h-8 w-8 text-slate-400" aria-hidden />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">
          Página não encontrada
        </h1>
        <p className="text-base text-slate-500 max-w-md mb-8">
          O endereço que você acessou não existe ou foi movido.
          Mas você ainda pode publicar o que sua empresa precisa — vendedores te contactam direto.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/postar"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-primary-600)] px-6 py-3 text-sm font-semibold text-white hover:bg-[color:var(--brand-primary-700)] transition-colors"
          >
            Publicar minha demanda
          </Link>
          <Link
            href="/buscar"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Search className="h-4 w-4" />
            Ver demandas publicadas
          </Link>
        </div>
      </div>
    </GuestShell>
  );
}
