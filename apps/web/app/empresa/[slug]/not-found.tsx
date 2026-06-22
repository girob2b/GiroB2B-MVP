import Link from "next/link";
import { FileQuestion, Search } from "lucide-react";

/**
 * not-found para /empresa/[slug].
 * Quando a empresa não existe OU não é elegível (não optou por aparecer
 * publicamente / sem CNPJ + razão social). A view buyers_public filtra a
 * elegibilidade, então um slug não elegível simplesmente não resolve.
 */
export default function EmpresaNotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <FileQuestion className="h-7 w-7 text-slate-400" aria-hidden />
      </div>
      <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
        Empresa não encontrada
      </h2>
      <p className="mb-8 max-w-sm text-sm text-slate-500">
        Este perfil de empresa não existe ou não está mais disponível
        publicamente. Veja as demandas abertas ou publique a sua.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/postar"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-primary-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--brand-primary-700)]"
        >
          Publicar minha demanda
        </Link>
        <Link
          href="/buscar"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Search className="h-4 w-4" />
          Ver demandas
        </Link>
      </div>
    </div>
  );
}
