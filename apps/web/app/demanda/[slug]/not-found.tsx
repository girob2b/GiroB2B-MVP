import Link from "next/link";
import { Search, FileQuestion } from "lucide-react";

/**
 * not-found para /demanda/[slug].
 * Quando getDemandBySlug retorna null e notFound() é chamado.
 * Sem GuestShell aqui — o not-found de rota aninhada herda o layout pai.
 * CTA buyer-first: publicar demanda ou ver o feed.
 */
export default function NecessidadeNotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-5">
        <FileQuestion className="h-7 w-7 text-slate-400" aria-hidden />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
        Demanda não encontrada
      </h2>
      <p className="text-sm text-slate-500 max-w-sm mb-8">
        Esta demanda não existe, foi encerrada ou expirou. Publique a sua — é
        grátis e vendedores te contactam direto.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/postar"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-primary-600)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--brand-primary-700)] transition-colors"
        >
          Publicar minha demanda
        </Link>
        <Link
          href="/buscar"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Search className="h-4 w-4" />
          Ver demandas abertas
        </Link>
      </div>
    </div>
  );
}
