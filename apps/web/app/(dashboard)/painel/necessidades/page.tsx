import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, MessageCircle, Plus, BadgeCheck, ShieldAlert, ClipboardList, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listMyDemands } from "@/lib/services/demands";
import DemandActions from "./_components/demand-actions";

export const metadata: Metadata = { title: "Minhas demandas" };
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

  const admin = createAdminClient();
  const [demands, { data: buyerProfile }] = await Promise.all([
    listMyDemands(authData.user.id),
    admin
      .from("buyers")
      .select("name, phone, cnpj, company_name, city, state")
      .eq("user_id", authData.user.id)
      .maybeSingle<{
        name: string | null;
        phone: string | null;
        cnpj: string | null;
        company_name: string | null;
        city: string | null;
        state: string | null;
      }>(),
  ]);

  // Score simples de completude — usado pra decidir o tom do banner.
  const profileChecks = {
    name: !!buyerProfile?.name,
    phone: !!buyerProfile?.phone,
    cnpj: !!buyerProfile?.cnpj,
    company_name: !!buyerProfile?.company_name,
    city: !!buyerProfile?.city,
    state: !!buyerProfile?.state,
  };
  const completedCount = Object.values(profileChecks).filter(Boolean).length;
  const totalChecks = Object.keys(profileChecks).length;
  const profileComplete = completedCount === totalChecks;
  const isVerified = !!buyerProfile?.cnpj && !!buyerProfile?.company_name;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Tabs: Minhas demandas | Ofertas recebidas */}
      <nav className="flex gap-1 border-b border-slate-200 -mt-2" aria-label="Seções do painel do comprador">
        <span
          aria-current="page"
          className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-brand-700 border-b-2 border-brand-600 -mb-px"
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          Minhas demandas
        </span>
        <Link
          href="/painel/necessidades/ofertas"
          className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Inbox className="h-4 w-4" aria-hidden="true" />
          Ofertas recebidas
        </Link>
      </nav>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Minhas demandas</h1>
          <p className="text-sm text-slate-500">
            Acompanhe quem está vendo e contatando suas publicações.
          </p>
        </div>
        <Link
          href="/painel/postar"
          className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--brand-primary-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--brand-primary-700)]"
        >
          <Plus className="h-4 w-4" /> Publicar demanda
        </Link>
      </header>

      {justPublished && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Demanda publicada. Agora é só esperar — fornecedores assinantes vão te contatar pelo
          WhatsApp.
        </div>
      )}

      {!profileComplete ? (
        <ProfileNudge
          completedCount={completedCount}
          totalChecks={totalChecks}
          isVerified={isVerified}
        />
      ) : (
        isVerified && (
          <div className="rounded-xl border border-[color:var(--brand-primary-200)] bg-[color:var(--brand-primary-50)] px-4 py-3 text-sm text-[color:var(--brand-primary-800)] flex items-start gap-3">
            <BadgeCheck className="h-5 w-5 shrink-0 text-[color:var(--brand-primary-700)]" />
            <p>
              <strong>Comprador Verificado.</strong> Suas demandas aparecem em destaque para os
              vendedores assinantes.
            </p>
          </div>
        )
      )}

      {demands.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-900">Você ainda não publicou nada</p>
          <p className="mt-2 text-sm text-slate-500">
            Publique sua primeira demanda e receba contato direto de fornecedores qualificados.
          </p>
          <Link
            href="/painel/postar"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[color:var(--brand-primary-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--brand-primary-700)]"
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

function ProfileNudge({
  completedCount,
  totalChecks,
  isVerified,
}: {
  completedCount: number;
  totalChecks: number;
  isVerified: boolean;
}) {
  const percent = Math.round((completedCount / totalChecks) * 100);
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-amber-900">
          {isVerified
            ? "Quase lá — complete seu perfil"
            : "Aumente a visibilidade das suas demandas"}
        </p>
        <p className="text-amber-800">
          Compradores verificados (CNPJ + empresa) aparecem em destaque pros vendedores
          assinantes — mais contatos, melhores leads. Seu perfil está {percent}% completo.
        </p>
      </div>
      <Link
        href="/painel/perfil"
        className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
      >
        Completar perfil
      </Link>
    </div>
  );
}
