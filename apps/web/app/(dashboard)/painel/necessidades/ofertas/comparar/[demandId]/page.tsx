import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClipboardList, Inbox } from "lucide-react";
import { DemandComparator } from "./_components/demand-comparator";

export const metadata: Metadata = {
  title: "Comparar cotações — GiroB2B",
};
export const dynamic = "force-dynamic";

/**
 * Tela do Comparador de Cotações — Fase 2a.
 *
 * Rota: /painel/necessidades/ofertas/comparar/[demandId]
 * Auth: requer sessão autenticada (redirect → /login).
 *
 * O gate de ownership da demanda é verificado pelo Route Handler
 * GET /api/buyer/comparator/[demandId] — retorna 403 se a demanda não
 * pertence ao comprador autenticado. O Client Component trata o 403.
 */
export default async function ComparadorPage({
  params,
}: {
  params: Promise<{ demandId: string }>;
}) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { demandId } = await params;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tabs — mantém o mesmo padrão das páginas vizinhas */}
      <nav
        className="flex gap-1 border-b border-slate-200"
        aria-label="Seções do painel do comprador"
      >
        <Link
          href="/painel/necessidades"
          className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          Minhas demandas
        </Link>
        <Link
          href="/painel/necessidades/ofertas"
          className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-brand-700 border-b-2 border-brand-600 -mb-px"
          aria-current="page"
        >
          <Inbox className="h-4 w-4" aria-hidden="true" />
          Ofertas recebidas
        </Link>
      </nav>

      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Link
            href="/painel/necessidades/ofertas"
            className="text-sm text-slate-500 hover:text-slate-800 hover:underline"
          >
            Ofertas recebidas
          </Link>
          <span className="text-slate-300" aria-hidden="true">/</span>
          <span className="text-sm text-slate-700 font-medium">Comparar</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Comparador de cotações
        </h1>
        <p className="text-sm text-slate-500">
          Cotações ranqueadas pelo seu critério — melhor score primeiro.
        </p>
      </header>

      {/* Client Component — faz fetch em /api/buyer/comparator/[demandId] */}
      <DemandComparator demandId={demandId} />
    </div>
  );
}
