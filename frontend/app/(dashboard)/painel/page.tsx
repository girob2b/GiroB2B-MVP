import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Package, MessageSquare, Eye, TrendingUp, ArrowRight, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Painel" };

interface SupplierRow {
  id: string;
  trade_name: string;
  profile_completeness: number;
  plan: string;
  city: string;
  state: string;
}

interface InquiryRow {
  id: string;
  buyer_name: string;
  buyer_city: string | null;
  description: string;
  created_at: string;
  status: string;
}

async function getDashboardData(userId: string) {
  const supabase = await createClient();
  const db = supabase;

  const supplierRes = await db
    .from("suppliers")
    .select("id, trade_name, profile_completeness, plan, city, state")
    .eq("user_id", userId)
    .single();

  const supplier = supplierRes.data as SupplierRow | null;
  if (!supplier) return null;

  const [productsRes, inquiriesRes, newInquiriesRes, recentRes] = await Promise.all([
    db.from("products").select("*", { count: "exact", head: true })
      .eq("supplier_id", supplier.id).eq("status", "active"),
    db.from("inquiries").select("*", { count: "exact", head: true })
      .eq("supplier_id", supplier.id),
    db.from("inquiries").select("*", { count: "exact", head: true })
      .eq("supplier_id", supplier.id).eq("status", "new"),
    db.from("inquiries").select("id, buyer_name, buyer_city, description, created_at, status")
      .eq("supplier_id", supplier.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalProducts: number = productsRes.count ?? 0;
  const totalInquiries: number = inquiriesRes.count ?? 0;
  const newInquiries: number = newInquiriesRes.count ?? 0;
  const recentInquiries: InquiryRow[] = recentRes.data ?? [];

  return {
    supplier,
    stats: { totalProducts, totalInquiries, newInquiries },
    recentInquiries,
  };
}

export default async function PainelPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  const userId = authData.user!.id;

  const data = await getDashboardData(userId);
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Perfil de fornecedor não encontrado.</p>
          <Button render={<Link href="/registro" />}>Criar perfil</Button>
        </div>
      </div>
    );
  }

  const { supplier, stats, recentInquiries } = data;
  const profileIncomplete = supplier.profile_completeness < 100;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {supplier.trade_name} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {supplier.city}, {supplier.state}
        </p>
      </div>

      {/* Alerta de perfil incompleto */}
      {profileIncomplete && supplier.profile_completeness < 60 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold text-amber-800">
                Seu perfil está incompleto ({supplier.profile_completeness}%)
              </p>
              <p className="text-sm text-amber-700">
                Perfis completos aparecem em posições melhores na busca e recebem 3x mais inquiries.
              </p>
              <Progress value={supplier.profile_completeness} className="h-2 bg-amber-200" />
              <Button
                size="sm"
                render={<Link href="/painel/perfil" />}
                className="mt-2 btn-primary rounded-lg h-9"
              >
                Completar perfil
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Produtos ativos"
          value={stats.totalProducts}
          icon={<Package className="w-5 h-5 text-emerald-600" />}
          href="/painel/produtos"
          emptyMessage={stats.totalProducts === 0 ? "Adicione seu primeiro produto" : undefined}
        />
        <StatCard
          title="Inquiries recebidas"
          value={stats.totalInquiries}
          icon={<MessageSquare className="w-5 h-5 text-blue-600" />}
          href="/painel/inquiries"
        />
        <StatCard
          title="Novas (não lidas)"
          value={stats.newInquiries}
          icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
          href="/painel/inquiries"
          highlight={stats.newInquiries > 0}
        />
        <StatCard
          title="Completude do perfil"
          value={`${supplier.profile_completeness}%`}
          icon={<Eye className="w-5 h-5 text-orange-500" />}
          href="/painel/perfil"
        />
      </div>

      {/* Inquiries recentes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Inquiries recentes</h2>
          <Button variant="ghost" size="sm" render={<Link href="/painel/inquiries" />}>
            Ver todas
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {recentInquiries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground font-medium">Nenhuma inquiry ainda</p>
              <p className="text-sm text-muted-foreground">
                Adicione produtos ao seu catálogo para começar a receber cotações.
              </p>
              <Button 
                render={<Link href="/painel/produtos/novo" />}
                className="btn-primary rounded-xl h-10 px-6"
              >
                Adicionar produto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentInquiries.map((inquiry) => (
              <Card key={inquiry.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {inquiry.buyer_name === "***" ? "Comprador anônimo" : inquiry.buyer_name}
                        </span>
                        {inquiry.buyer_city && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            📍 {inquiry.buyer_city}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {inquiry.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inquiry.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <InquiryStatusBadge status={inquiry.status} />
                      <Button variant="ghost" size="sm" render={<Link href={`/painel/inquiries/${inquiry.id}`} />}>
                        Ver
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* CTA se não tem produtos */}
      {stats.totalProducts === 0 && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="py-6 px-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-emerald-900">Adicione seus produtos para aparecer nas buscas</p>
                <p className="text-sm text-emerald-800">
                  Cada produto que você cadastrar vira uma página indexada no Google.
                </p>
                <Button
                  size="sm"
                  render={<Link href="/painel/produtos/novo" />}
                  className="bg-emerald-500 hover:bg-emerald-600 mt-2"
                >
                  Adicionar primeiro produto
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  title, value, icon, href, emptyMessage, highlight
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  href: string;
  emptyMessage?: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href} className={[
      "block rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow",
      highlight ? "border-purple-200 bg-purple-50/50" : "border-border",
    ].join(" ")}>
      <div className="flex flex-row items-center justify-between p-4 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon}
      </div>
      <div className="px-4 pb-4">
        <div className="text-3xl font-bold">{value}</div>
        {emptyMessage && (
          <p className="text-xs text-muted-foreground mt-1">{emptyMessage}</p>
        )}
      </div>
    </Link>
  );
}

function InquiryStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    new:      { label: "Nova",        variant: "default" },
    viewed:   { label: "Visualizada", variant: "secondary" },
    replied:  { label: "Respondida",  variant: "outline" },
    archived: { label: "Arquivada",   variant: "outline" },
    spam:     { label: "Spam",        variant: "destructive" },
  };
  const info = map[status] ?? { label: status, variant: "secondary" };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
