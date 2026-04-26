import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import SuspendButton from "./_components/suspend-button";

export const metadata = { title: "Fornecedores — Admin" };
export const dynamic = "force-dynamic";

interface SupplierRow {
  id: string;
  trade_name: string;
  cnpj: string | null;
  city: string | null;
  state: string | null;
  plan: string;
  suspended: boolean;
  profile_completeness: number;
  created_at: string;
}

export default async function AdminFornecedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageParam, q } = await searchParams;
  const page  = Math.max(1, parseInt(pageParam ?? "1", 10));
  const limit = 30;
  const from  = (page - 1) * limit;

  const supabase = await createClient();

  let query = supabase
    .from("suppliers")
    .select("id, trade_name, cnpj, city, state, plan, suspended, profile_completeness, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (q?.trim()) {
    query = query.ilike("trade_name", `%${q.trim()}%`);
  }

  const { data, count } = await query;
  const suppliers = (data ?? []) as SupplierRow[];
  const totalPages = Math.ceil((count ?? 0) / limit);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fornecedores</h1>
          <p className="text-sm text-slate-500 mt-1">{count ?? 0} cadastrados no total.</p>
        </div>

        <form method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nome…"
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48"
          />
          <button
            type="submit"
            className="h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Buscar
          </button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs font-medium uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Nome / CNPJ</th>
                  <th className="text-left px-4 py-3">Localização</th>
                  <th className="text-left px-4 py-3">Plano</th>
                  <th className="text-left px-4 py-3">Perfil</th>
                  <th className="text-left px-4 py-3">Cadastro</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Nenhum fornecedor encontrado.
                    </td>
                  </tr>
                )}
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{s.trade_name}</p>
                      {s.cnpj && <p className="text-xs text-slate-400">{formatCnpj(s.cnpj)}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {[s.city, s.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {s.plan ?? "free"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.profile_completeness}%</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {formatDate(s.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {s.suspended ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Suspenso</Badge>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Ativo</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SuspendButton supplierId={s.id} suspended={s.suspended} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Anterior
              </a>
            )}
            {page < totalPages && (
              <a
                href={`?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Próxima
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatCnpj(cnpj: string) {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
