import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SendHorizonal, ClipboardList } from "lucide-react";
import { SentOffersInbox } from "./_components/sent-offers-inbox";

export const metadata: Metadata = { title: "Propostas enviadas — GiroB2B" };
export const dynamic = "force-dynamic";

export default async function PropostasPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tabs: Feed de demandas | Propostas enviadas */}
      <nav
        className="flex gap-1 border-b border-slate-200"
        aria-label="Seções do painel do vendedor"
      >
        <Link
          href="/painel/leads"
          className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          Feed de demandas
        </Link>
        <span
          aria-current="page"
          className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-brand-700 border-b-2 border-brand-600 -mb-px"
        >
          <SendHorizonal className="h-4 w-4" aria-hidden="true" />
          Propostas enviadas
        </span>
      </nav>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Propostas enviadas</h1>
        <p className="text-sm text-slate-500">
          Registro das demandas que você contatou — empresa, oferta e data de envio.
        </p>
      </header>

      {/* Client Component — faz fetch em /api/supplier/inboxes/sent */}
      <SentOffersInbox />
    </div>
  );
}
