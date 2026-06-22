"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Error boundary — /buscar
 * Falha do Supabase (rede/RLS) não mostra tela branca.
 * Retry recarrega o segmento sem perder os filtros da URL.
 */
export default function BuscarError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[buscar] error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 mb-5">
        <AlertTriangle className="h-7 w-7 text-red-400" aria-hidden />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Não foi possível carregar as demandas
      </h2>
      <p className="text-sm text-slate-500 max-w-sm mb-7">
        Ocorreu um erro temporário ao buscar as demandas. Tente novamente ou
        volte à página inicial.
      </p>
      <div className="flex gap-3 flex-col sm:flex-row">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-primary-600)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--brand-primary-700)] transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Tentar novamente
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
