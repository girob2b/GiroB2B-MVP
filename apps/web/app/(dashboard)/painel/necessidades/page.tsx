import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, MessageCircle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listMyDemands } from "@/lib/services/demands";
import DemandActions from "./_components/demand-actions";

export const metadata: Metadata = { title: "Minhas necessidades" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  open: "Aberta",
  negotiating: "Em negociação",
  fulfilled: "Resolvida",
  cancelled: "Cancelada",
  expired: "Expirada",
};

const STATUS_TONE: Record<string, string> = {
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  negotiating: "bg-blue-50 text-blue-700 border-blue-200",
  fulfilled: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-amber-50 text-amber-700 border-amber-200",
};

interface SearchParams {
  published?: string;
}

export default async function NecessidadesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const params = await searchParams;
  const justPublished = params.published === "1";

  const demands = await listMyDemands(authData.user.id);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Minhas necessidades</h1>
          <p className="text-sm text-slate-500">
            Acompanhe quem está vendo e contatando suas publicações.
          </p>
        </div>
        <Link
          href="/painel/postar"
          className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--brand-green-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)]"
        >
          <Plus className="h-4 w-4" /> Publicar necessidade
        </Link>
      </header>

      {justPublished && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Necessidade publicada. Agora é só esperar — fornecedores assinantes vão te contatar pelo
          WhatsApp.
        </div>
      )}

      {demands.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-900">Você ainda não publicou nada</p>
          <p className="mt-2 text-sm text-slate-500">
            Publique sua primeira necessidade e receba contato direto de fornecedores qualificados.
          </p>
          <Link
            href="/painel/postar"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[color:var(--brand-green-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)]"
          >
            <Plus className="h-4 w-4" /> Começar agora
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="text-left px-4 py-3">Título</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Localização</th>
                <th className="text-left px-4 py-3">Visualizações</th>
                <th className="text-left px-4 py-3">Contatos</th>
                <th className="text-left px-4 py-3">Publicado</th>
                <th className="text-left px-4 py-3">Expira</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demands.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/necessidade/${d.slug}`} className="font-medium text-slate-900 hover:underline" target="_blank">
                      {d.title}
                    </Link>
                    <p className="text-xs text-slate-500 line-clamp-1">{d.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[d.status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {[d.delivery_city, d.delivery_state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5 text-slate-400" /> {d.views_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5 text-slate-400" /> {d.contact_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(d.published_at)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(d.expires_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <DemandActions demandId={d.id} status={d.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
