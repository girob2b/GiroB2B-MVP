import { createAdminClient } from "@/lib/supabase-admin";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Lista de Espera - Admin" };
export const dynamic = "force-dynamic";

type WaitlistRow = {
  id: string;
  role: "supplier" | "enterprise";
  email: string;
  name: string | null;
  company: string | null;
  cnpj: string | null;
  category: string | null;
  consent_marketing: boolean | null;
  estimated_volume: string | null;
  message: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
};

type Tab = "todos" | "supplier" | "enterprise";

interface WaitlistPageProps {
  searchParams: Promise<{ tab?: string }>;
}

function normalizeTab(tab: string | undefined): Tab {
  if (tab === "supplier" || tab === "enterprise") return tab;
  return "todos";
}

const TAB_LABEL: Record<Tab, string> = {
  todos: "Todos",
  supplier: "Fornecedores",
  enterprise: "Enterprise",
};

const TAB_ORDER: Tab[] = ["todos", "supplier", "enterprise"];

export default async function AdminWaitlistPage({ searchParams }: WaitlistPageProps) {
  const { tab } = await searchParams;
  const activeTab = normalizeTab(tab);

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <p className="text-sm text-red-600">Erro ao carregar a lista de espera: {error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as WaitlistRow[];

  const rowsByTab: Record<Tab, WaitlistRow[]> = {
    todos: rows,
    supplier: rows.filter((r) => r.role === "supplier"),
    enterprise: rows.filter((r) => r.role === "enterprise"),
  };

  const activeRows = rowsByTab[activeTab];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Lista de Espera</h1>
        <p className="text-sm text-slate-500">
          Inscritos pela landing page — fornecedores e contatos enterprise.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Abas da waitlist">
        {TAB_ORDER.map((tabKey) => {
          const isActive = activeTab === tabKey;
          return (
            <a
              key={tabKey}
              href={`/waitlist?tab=${tabKey}`}
              className={[
                "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
              ].join(" ")}
            >
              {TAB_LABEL[tabKey]} ({rowsByTab[tabKey].length})
            </a>
          );
        })}
      </nav>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs font-medium uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Nome / Empresa</th>
                  <th className="text-left px-4 py-3">CNPJ / Volume</th>
                  <th className="text-left px-4 py-3">Categoria / Mensagem</th>
                  <th className="text-left px-4 py-3">Origem</th>
                  <th className="text-left px-4 py-3">Inscrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Nenhum inscrito encontrado nesta aba.
                    </td>
                  </tr>
                )}

                {activeRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                          row.role === "supplier"
                            ? "border-teal-200 bg-teal-50 text-teal-700"
                            : "border-purple-200 bg-purple-50 text-purple-700",
                        ].join(" ")}
                      >
                        {row.role === "supplier" ? "Fornecedor" : "Enterprise"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.email}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.role === "supplier"
                        ? "-"
                        : [row.name, row.company].filter(Boolean).join(" · ") || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.role === "supplier"
                        ? formatCNPJ(row.cnpj ?? "")
                        : (row.estimated_volume ?? "-")}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {row.role === "supplier"
                        ? (row.category ?? "-")
                        : (row.message ?? "-")}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatSource(row.source, row.utm_source, row.utm_medium)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCNPJ(cnpj: string) {
  const d = cnpj.replace(/\D/g, "");
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return cnpj || "-";
}

function formatSource(source: string | null, utmSource: string | null, utmMedium: string | null) {
  const parts = [source, utmSource, utmMedium].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "-";
}
