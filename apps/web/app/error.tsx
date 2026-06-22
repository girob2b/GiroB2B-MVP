"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Error boundary global — Next 16 App Router.
 * Obrigatório "use client" (React Error Boundary = client-only).
 * Prop `unstable_retry` (Next 16) em vez do `reset` do Next 13/14.
 *
 * Falha transitória do Supabase ou erro de render não mostra tela crua.
 * Oferece retry inline e link de saída buyer-first.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Log silencioso — não vazar detalhe ao usuário em prod
    console.error("[girob2b] render error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4 py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 mb-6">
        <AlertTriangle className="h-8 w-8 text-red-400" aria-hidden />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
        Algo deu errado
      </h2>
      <p className="text-sm text-slate-500 max-w-sm mb-8">
        Ocorreu um erro temporário. Tente novamente — se persistir, volte à
        página inicial.
        {error.digest && (
          <span className="mt-1 block text-[11px] text-slate-400">
            Código: {error.digest}
          </span>
        )}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-primary-600)] px-6 py-3 text-sm font-semibold text-white hover:bg-[color:var(--brand-primary-700)] transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Tentar novamente
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
