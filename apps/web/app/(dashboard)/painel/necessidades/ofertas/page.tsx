import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Inbox, ClipboardList } from "lucide-react";
import { ReceivedOffersInbox } from "./_components/received-offers-inbox";

export const metadata: Metadata = { title: "Ofertas recebidas — GiroB2B" };
export const dynamic = "force-dynamic";

export default async function OfertasPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tabs: Minhas demandas | Ofertas recebidas */}
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
        <span
          aria-current="page"
          className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-brand-700 border-b-2 border-brand-600 -mb-px"
        >
          <Inbox className="h-4 w-4" aria-hidden="true" />
          Ofertas recebidas
        </span>
      </nav>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ofertas recebidas</h1>
        <p className="text-sm text-slate-500">
          Vendedores que demonstraram interesse nas suas demandas — agrupado por demanda, do mais recente.
        </p>
      </header>

      {/* Client Component — faz fetch em /api/buyer/inboxes/received */}
      <ReceivedOffersInbox />
    </div>
  );
}
