import { createClient } from "@/lib/supabase/server";
import { Building2, Users, Package, MessageSquare, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin — GiroB2B" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    suppliersRes,
    suspendedRes,
    buyersRes,
    productsRes,
    inquiriesRes,
    newInquiriesRes,
  ] = await Promise.all([
    supabase.from("suppliers").select("*", { count: "exact", head: true }),
    supabase.from("suppliers").select("*", { count: "exact", head: true }).eq("suspended", true),
    supabase.from("buyers").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("inquiries").select("*", { count: "exact", head: true }),
    supabase
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
  ]);

  const stats = [
    {
      label: "Fornecedores",
      value: suppliersRes.count ?? 0,
      sub: suspendedRes.count ? `${suspendedRes.count} suspensos` : undefined,
      subAlert: (suspendedRes.count ?? 0) > 0,
      icon: Building2,
    },
    {
      label: "Compradores",
      value: buyersRes.count ?? 0,
      icon: Users,
    },
    {
      label: "Produtos ativos",
      value: productsRes.count ?? 0,
      icon: Package,
    },
    {
      label: "Cotações total",
      value: inquiriesRes.count ?? 0,
      sub: `${newInquiriesRes.count ?? 0} nos últimos 7 dias`,
      icon: MessageSquare,
      highlight: true,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Visão geral</h1>
        <p className="text-sm text-slate-500 mt-1">Métricas da plataforma em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, subAlert, icon: Icon, highlight }) => (
          <Card key={label}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <Icon className={`w-4 h-4 ${highlight ? "text-emerald-600" : "text-slate-400"}`} />
              </div>
              <p className="text-3xl font-bold text-slate-900">{value}</p>
              {sub && (
                <p className={`text-xs flex items-center gap-1 ${subAlert ? "text-amber-600" : "text-slate-400"}`}>
                  {subAlert && <AlertTriangle className="w-3 h-3 shrink-0" />}
                  {sub}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">Ações rápidas</p>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <a
              href="/admin/fornecedores"
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              Gerenciar fornecedores →
            </a>
            <a
              href="/admin/needs"
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              Ver necessidades de busca →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
