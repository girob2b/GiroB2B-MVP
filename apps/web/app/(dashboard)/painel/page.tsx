import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Package,
  MessageSquare,
  Eye,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Search,
  ClipboardList,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Painel" };

interface SupplierRow {
  id: string;
  trade_name: string;
  profile_completeness: number;
  plan: string;
  city: string | null;
  state: string | null;
}

interface BuyerRow {
  id: string;
  name: string | null;
  city: string | null;
  state: string | null;
}

interface SupplierInquiryRow {
  id: string;
  buyer_name: string;
  buyer_city: string | null;
  description: string;
  created_at: string;
  status: string;
}

interface BuyerInquiryRow {
  id: string;
  description: string;
  created_at: string;
  status: string;
  suppliers: { trade_name: string | null; slug: string | null } | null;
  products: { name: string | null } | null;
}

async function getSupplierHome(supplierId: string) {
  const supabase = await createClient();

  const [productsRes, inquiriesRes, newInquiriesRes, recentRes] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true })
      .eq("supplier_id", supplierId).eq("status", "active"),
    supabase.from("inquiries").select("*", { count: "exact", head: true })
      .eq("supplier_id", supplierId),
    supabase.from("inquiries").select("*", { count: "exact", head: true })
      .eq("supplier_id", supplierId).eq("status", "new"),
    supabase.from("inquiries").select("id, buyer_name, buyer_city, description, created_at, status")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    totalProducts: productsRes.count ?? 0,
    totalInquiries: inquiriesRes.count ?? 0,
    newInquiries: newInquiriesRes.count ?? 0,
    recentInquiries: (recentRes.data ?? []) as SupplierInquiryRow[],
  };
}

async function getBuyerHome(buyerId: string) {
  const supabase = await createClient();

  const [sentRes, respondedRes, pendingRes, recentRes] = await Promise.all([
    supabase.from("inquiries").select("*", { count: "exact", head: true })
      .eq("buyer_id", buyerId),
    supabase.from("inquiries").select("*", { count: "exact", head: true })
      .eq("buyer_id", buyerId).eq("status", "responded"),
    supabase.from("inquiries").select("*", { count: "exact", head: true })
      .eq("buyer_id", buyerId).in("status", ["new", "viewed"]),
    supabase.from("inquiries")
      .select("id, description, created_at, status, suppliers(trade_name, slug), products(name)")
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    sent: sentRes.count ?? 0,
    responded: respondedRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    recentInquiries: (recentRes.data ?? []) as unknown as BuyerInquiryRow[],
  };
}

export default async function PainelPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  const userId = authData.user.id;

  const [supplierRes, buyerRes] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, trade_name, profile_completeness, plan, city, state")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("buyers")
      .select("id, name, city, state")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const supplier = supplierRes.data as SupplierRow | null;
  const buyer = buyerRes.data as BuyerRow | null;

  if (supplier && buyer) {
    const [supplierStats, buyerStats] = await Promise.all([
      getSupplierHome(supplier.id),
      getBuyerHome(buyer.id),
    ]);
    return <BothHome supplier={supplier} supplierStats={supplierStats} buyerStats={buyerStats} />;
  }

  if (supplier) {
    const stats = await getSupplierHome(supplier.id);
    return <SupplierHome supplier={supplier} stats={stats} />;
  }

  if (buyer) {
    const stats = await getBuyerHome(buyer.id);
    return <BuyerHome buyer={buyer} stats={stats} />;
  }

  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center space-y-3">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">Perfil não encontrado.</p>
        <Button render={<Link href="/cadastro" />}>Criar perfil</Button>
      </div>
    </div>
  );
}

// ─── Supplier Home ────────────────────────────────────────────────────────────

function SupplierHome({
  supplier,
  stats,
}: {
  supplier: SupplierRow;
  stats: {
    totalProducts: number;
    totalInquiries: number;
    newInquiries: number;
    recentInquiries: SupplierInquiryRow[];
  };
}) {
  const profileIncomplete = supplier.profile_completeness < 100;
  const location = [supplier.city, supplier.state].filter(Boolean).join(" · ");

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {supplier.trade_name}!</h1>
        {location && <p className="text-muted-foreground mt-1">{location}</p>}
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Produtos ativos"
          value={stats.totalProducts}
          icon={<Package className="w-5 h-5 text-[color:var(--brand-green-600)]" />}
          href="/painel/produtos"
          emptyMessage={stats.totalProducts === 0 ? "Adicione seu primeiro produto" : undefined}
        />
        <StatCard
          title="Cotações recebidas"
          value={stats.totalInquiries}
          icon={<MessageSquare className="w-5 h-5 text-slate-500" />}
          href="/painel/inquiries"
        />
        <StatCard
          title="Novas (não lidas)"
          value={stats.newInquiries}
          icon={<TrendingUp className="w-5 h-5 text-[color:var(--brand-green-600)]" />}
          href="/painel/inquiries"
          highlight={stats.newInquiries > 0}
        />
        <StatCard
          title="Completude do perfil"
          value={`${supplier.profile_completeness}%`}
          icon={<Eye className="w-5 h-5 text-slate-500" />}
          href="/painel/perfil"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cotações recentes</h2>
          <Button variant="ghost" size="sm" render={<Link href="/painel/inquiries" />}>
            Ver todas
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {stats.recentInquiries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground font-medium">Nenhuma inquiry ainda</p>
              <p className="text-sm text-muted-foreground">
                Explore as cotações públicas disponíveis e manifeste interesse nos produtos que você fornece.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                <Button
                  render={<Link href="/painel/inquiries?tab=general" />}
                  className="btn-primary rounded-xl h-10 px-6"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Ver cotações disponíveis
                </Button>
                <Button
                  variant="outline"
                  render={<Link href="/painel/produtos/novo" />}
                  className="rounded-xl h-10 px-6"
                >
                  Adicionar produto
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {stats.recentInquiries.map((inquiry) => (
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
                      <p className="text-xs text-muted-foreground">{formatDate(inquiry.created_at)}</p>
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

      {stats.totalProducts === 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-6 px-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-amber-900">
                  Cadastre produtos para aparecer nas buscas e receber mais cotações
                </p>
                <p className="text-sm text-amber-800">
                  Fornecedores sem produtos ativos não aparecem para compradores. Cada produto cadastrado aumenta suas chances de receber cotações.
                </p>
                <Button
                  size="sm"
                  render={<Link href="/painel/produtos/novo" />}
                  className="btn-primary mt-2"
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

// ─── Buyer Home ───────────────────────────────────────────────────────────────

function BuyerHome({
  buyer,
  stats,
}: {
  buyer: BuyerRow;
  stats: {
    sent: number;
    responded: number;
    pending: number;
    recentInquiries: BuyerInquiryRow[];
  };
}) {
  const greeting = buyer.name?.trim() ? `Olá, ${buyer.name}!` : "Olá!";
  const location = [buyer.city, buyer.state].filter(Boolean).join(" · ");

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{greeting}</h1>
        <p className="text-muted-foreground mt-1">
          {location ? `${location} · ` : ""}Descubra fornecedores e acompanhe suas cotações.
        </p>
      </div>

      <Card className="border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)]/50">
        <CardContent className="py-5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[color:var(--brand-green-100)] flex items-center justify-center shrink-0">
              <Search className="w-5 h-5 text-[color:var(--brand-green-600)]" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-[color:var(--brand-green-900)]">
                Encontre fornecedores para o que você precisa
              </p>
              <p className="text-sm text-[color:var(--brand-green-800)]">
                Busque por produto, categoria ou cidade. A cotação sai direto do perfil do fornecedor.
              </p>
            </div>
          </div>
          <Button render={<Link href="/painel/explorar" />} className="btn-primary shrink-0">
            Explorar fornecedores
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Cotações enviadas"
          value={stats.sent}
          icon={<ClipboardList className="w-5 h-5 text-slate-500" />}
          href="/painel/inquiries?tab=sent"
        />
        <StatCard
          title="Respondidas"
          value={stats.responded}
          icon={<CheckCircle2 className="w-5 h-5 text-[color:var(--brand-green-600)]" />}
          href="/painel/inquiries?tab=sent"
          highlight={stats.responded > 0}
        />
        <StatCard
          title="Aguardando resposta"
          value={stats.pending}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          href="/painel/inquiries?tab=sent"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Últimas cotações enviadas</h2>
          <Button variant="ghost" size="sm" render={<Link href="/painel/inquiries?tab=sent" />}>
            Ver todas
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {stats.recentInquiries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground font-medium">Você ainda não enviou cotações</p>
              <p className="text-sm text-muted-foreground">
                Explore fornecedores e envie seu primeiro pedido quando encontrar uma boa opção.
              </p>
              <Button
                render={<Link href="/painel/explorar" />}
                className="btn-primary rounded-xl h-10 px-6"
              >
                Explorar fornecedores
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {stats.recentInquiries.map((inquiry) => {
              const supplierName = inquiry.suppliers?.trade_name ?? "Fornecedor";
              const productName = inquiry.products?.name;
              return (
                <Card key={inquiry.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{supplierName}</span>
                          {productName && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              · {productName}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {inquiry.description}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(inquiry.created_at)}</p>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Both Home ────────────────────────────────────────────────────────────────

function BothHome({
  supplier,
  supplierStats,
  buyerStats,
}: {
  supplier: SupplierRow;
  supplierStats: {
    totalProducts: number;
    totalInquiries: number;
    newInquiries: number;
    recentInquiries: SupplierInquiryRow[];
  };
  buyerStats: {
    sent: number;
    responded: number;
    pending: number;
    recentInquiries: BuyerInquiryRow[];
  };
}) {
  const location = [supplier.city, supplier.state].filter(Boolean).join(" · ");
  const profileIncomplete = supplier.profile_completeness < 60;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {supplier.trade_name}!</h1>
        {location && <p className="text-muted-foreground mt-1">{location}</p>}
      </div>

      {/* ── Como Comprador ── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" />
          Como Comprador
        </p>

        <Card className="border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)]/50">
          <CardContent className="py-4 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5">
              <p className="font-semibold text-[color:var(--brand-green-900)]">Encontre fornecedores para o que você precisa</p>
              <p className="text-sm text-[color:var(--brand-green-800)]">Busque por produto, categoria ou cidade.</p>
            </div>
            <Button render={<Link href="/painel/explorar" />} className="btn-primary shrink-0">
              Explorar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Cotações enviadas"
            value={buyerStats.sent}
            icon={<ClipboardList className="w-5 h-5 text-slate-500" />}
            href="/painel/inquiries?tab=sent"
          />
          <StatCard
            title="Respondidas"
            value={buyerStats.responded}
            icon={<CheckCircle2 className="w-5 h-5 text-[color:var(--brand-green-600)]" />}
            href="/painel/inquiries?tab=sent"
            highlight={buyerStats.responded > 0}
          />
          <StatCard
            title="Aguardando resposta"
            value={buyerStats.pending}
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            href="/painel/inquiries?tab=sent"
          />
        </div>
      </div>

      {/* ── Como Fornecedor ── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" />
          Como Fornecedor
        </p>

        {profileIncomplete && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold text-amber-800">
                  Perfil de fornecedor incompleto ({supplier.profile_completeness}%)
                </p>
                <p className="text-sm text-amber-700">
                  Perfis completos recebem 3x mais cotações e aparecem melhor na busca.
                </p>
                <Progress value={supplier.profile_completeness} className="h-2 bg-amber-200" />
                <Button size="sm" render={<Link href="/painel/perfil" />} className="mt-2 btn-primary rounded-lg h-9">
                  Completar perfil
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Produtos ativos"
            value={supplierStats.totalProducts}
            icon={<Package className="w-5 h-5 text-[color:var(--brand-green-600)]" />}
            href="/painel/produtos"
            emptyMessage={supplierStats.totalProducts === 0 ? "Adicione seu primeiro produto" : undefined}
          />
          <StatCard
            title="Cotações recebidas"
            value={supplierStats.totalInquiries}
            icon={<MessageSquare className="w-5 h-5 text-slate-500" />}
            href="/painel/inquiries"
          />
          <StatCard
            title="Novas (não lidas)"
            value={supplierStats.newInquiries}
            icon={<TrendingUp className="w-5 h-5 text-[color:var(--brand-green-600)]" />}
            href="/painel/inquiries"
            highlight={supplierStats.newInquiries > 0}
          />
          <StatCard
            title="Completude do perfil"
            value={`${supplier.profile_completeness}%`}
            icon={<Eye className="w-5 h-5 text-slate-500" />}
            href="/painel/perfil"
          />
        </div>

        {supplierStats.recentInquiries.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Cotações recebidas recentemente</h2>
              <Button variant="ghost" size="sm" render={<Link href="/painel/inquiries" />}>
                Ver todas
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {supplierStats.recentInquiries.slice(0, 3).map((inquiry) => (
              <Card key={inquiry.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {inquiry.buyer_name === "***" ? "Comprador anônimo" : inquiry.buyer_name}
                        </span>
                        {inquiry.buyer_city && (
                          <span className="text-xs text-muted-foreground shrink-0">📍 {inquiry.buyer_city}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{inquiry.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(inquiry.created_at)}</p>
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
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  title,
  value,
  icon,
  href,
  emptyMessage,
  highlight,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  href: string;
  emptyMessage?: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group block rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all",
        highlight ? "border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)]/50" : "border-border hover:border-[color:var(--brand-green-200)]",
      ].join(" ")}
    >
      <div className="flex flex-row items-center justify-between p-4 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon}
      </div>
      <div className="px-4 pb-4 flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold">{value}</div>
          {emptyMessage && <p className="text-xs text-muted-foreground mt-1">{emptyMessage}</p>}
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-[color:var(--brand-green-600)] transition-colors mb-0.5" />
      </div>
    </Link>
  );
}

function InquiryStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    new:       { label: "Nova",        className: "bg-[color:var(--brand-green-100)] text-[color:var(--brand-green-700)] border-[color:var(--brand-green-200)]" },
    viewed:    { label: "Visualizada", className: "bg-slate-100 text-slate-600 border-slate-200" },
    responded: { label: "Respondida",  className: "bg-slate-100 text-slate-600 border-slate-200" },
    archived:  { label: "Arquivada",   className: "bg-slate-100 text-slate-500 border-slate-200" },
    reported:  { label: "Denunciada",  className: "bg-destructive/10 text-destructive border-destructive/20" },
  };
  const info = map[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border-slate-200" };
  return <Badge variant="outline" className={info.className}>{info.label}</Badge>;
}
