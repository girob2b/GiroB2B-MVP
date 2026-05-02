import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Brain,
  ClipboardList,
  Lock,
  MessageSquare,
  PackageSearch,
  Plus,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Central de Cotacoes" };

type InquiryStatus = "new" | "viewed" | "responded" | "archived" | "reported";
type NeedStatus = "pending" | "in_progress" | "fulfilled" | "registered" | "cadastrado" | "rejected";
type SupplierPlan = "free" | "starter" | "pro" | "premium";
type QuoteTab = "received" | "sent" | "research" | "needs";

interface SupplierRow {
  id: string;
  plan: SupplierPlan;
}

interface BuyerRow {
  id: string;
}

interface InquiryRow {
  id: string;
  supplier_id: string | null;
  product_id: string | null;
  description: string;
  quantity_estimate: string | null;
  desired_deadline: string | null;
  status: InquiryStatus;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_company: string | null;
  buyer_city: string | null;
  buyer_state: string | null;
  contact_unlocked: boolean;
  created_at: string;
  products?: { name: string | null } | null;
  suppliers?: { trade_name: string | null; slug: string | null } | null;
}

interface NeedRow {
  id: string;
  query: string;
  description: string | null;
  status: NeedStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface InquiriesPageProps {
  searchParams: Promise<{ tab?: string }>;
}

const TAB_COPY: Record<QuoteTab, { label: string; description: string; icon: React.ElementType }> = {
  received: {
    label: "Recebidas",
    description: "Cotações abertas enviadas para seus produtos.",
    icon: MessageSquare,
  },
  sent: {
    label: "Enviadas",
    description: "Cotações criadas por você para produtos já cadastrados na plataforma.",
    icon: ClipboardList,
  },
  research: {
    label: "Pesquisas",
    description: "Pesquisa profunda de mercado para futuras negociacoes.",
    icon: Search,
  },
  needs: {
    label: "Necessidades",
    description: "Acompanhe as necessidades publicadas para analise administrativa.",
    icon: PackageSearch,
  },
};

function visibleTabs(hasSupplier: boolean, hasBuyer: boolean): QuoteTab[] {
  if (hasSupplier && hasBuyer) return ["received", "sent", "research", "needs"];
  if (hasSupplier) return ["received"];
  if (hasBuyer) return ["sent", "research", "needs"];
  return ["sent"];
}

function normalizeTab(value: string | undefined, allowed: QuoteTab[]): QuoteTab {
  if (value && allowed.includes(value as QuoteTab)) return value as QuoteTab;
  return allowed[0];
}

function statusInfo(status: InquiryStatus | string) {
  const map: Record<string, { label: string; className: string }> = {
    new: {
      label: "Nova",
      className:
        "bg-[color:var(--brand-green-100)] text-[color:var(--brand-green-700)] border-[color:var(--brand-green-200)]",
    },
    viewed: { label: "Visualizada", className: "bg-slate-100 text-slate-600 border-slate-200" },
    responded: { label: "Respondida", className: "bg-slate-100 text-slate-600 border-slate-200" },
    archived: { label: "Arquivada", className: "bg-slate-100 text-slate-500 border-slate-200" },
    reported: { label: "Denunciada", className: "bg-destructive/10 text-destructive border-destructive/20" },
  };
  return map[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border-slate-200" };
}

function needStatusInfo(status: NeedStatus | string) {
  const map: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Pendente",
      className: "bg-amber-100 text-amber-800 border-amber-200",
    },
    in_progress: {
      label: "Em andamento",
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
    fulfilled: {
      label: "Cadastrado",
      className: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    registered: {
      label: "Cadastrado",
      className: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    cadastrado: {
      label: "Cadastrado",
      className: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    rejected: {
      label: "Rejeitado",
      className: "bg-slate-100 text-slate-600 border-slate-200",
    },
  };
  return map[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border-slate-200" };
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function locationLabel(inquiry: InquiryRow) {
  return [inquiry.buyer_city, inquiry.buyer_state].filter(Boolean).join(" - ");
}

function hasNeedUpdate(need: NeedRow) {
  const createdAt = new Date(need.created_at).getTime();
  const updatedAt = new Date(need.updated_at).getTime();
  return Number.isFinite(createdAt) && Number.isFinite(updatedAt) && updatedAt - createdAt > 1000;
}

function getSupplierDisplay(inquiry: InquiryRow, supplier: SupplierRow) {
  const canShowContact = supplier.plan !== "free" && inquiry.contact_unlocked;
  return {
    title: canShowContact ? inquiry.buyer_name ?? "Comprador" : "Dados de contato ocultos",
    subtitle: canShowContact
      ? [inquiry.buyer_company, inquiry.buyer_email, inquiry.buyer_phone].filter(Boolean).join(" | ")
      : "Planos gratuitos mostram a cotacao, mas preservam contato do comprador.",
    locked: !canShowContact,
  };
}

function getBuyerDisplay(inquiry: InquiryRow) {
  return {
    title: inquiry.suppliers?.trade_name ?? "Fornecedor",
    subtitle: inquiry.products?.name ?? "Produto cotado",
    locked: false,
  };
}

async function getQuoteCenterData(userId: string) {
  const supabase = await createClient();

  const [supplierRes, buyerRes] = await Promise.all([
    supabase.from("suppliers").select("id, plan").eq("user_id", userId).maybeSingle<SupplierRow>(),
    supabase.from("buyers").select("id").eq("user_id", userId).maybeSingle<BuyerRow>(),
  ]);

  const [receivedRes, sentRes, needsRes] = await Promise.all([
    supplierRes.data
      ? supabase
          .from("inquiries")
          .select(`
            id,
            supplier_id,
            product_id,
            description,
            quantity_estimate,
            desired_deadline,
            status,
            buyer_name,
            buyer_email,
            buyer_phone,
            buyer_company,
            buyer_city,
            buyer_state,
            contact_unlocked,
            created_at,
            products(name)
          `)
          .or(`supplier_id.eq.${supplierRes.data.id},inquiry_type.eq.generic`)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),

    buyerRes.data
      ? supabase
          .from("inquiries")
          .select(`
            id,
            supplier_id,
            product_id,
            description,
            quantity_estimate,
            desired_deadline,
            status,
            buyer_name,
            buyer_email,
            buyer_phone,
            buyer_company,
            buyer_city,
            buyer_state,
            contact_unlocked,
            created_at,
            products(name),
            suppliers(trade_name, slug)
          `)
          .eq("buyer_id", buyerRes.data.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    buyerRes.data
      ? supabase
          .from("search_needs")
          .select("id, query, description, status, admin_notes, created_at, updated_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (receivedRes.error) throw new Error("Não foi possível carregar as cotações recebidas.");
  if (sentRes.error) throw new Error("Não foi possível carregar suas cotações enviadas.");
  if (needsRes.error) throw new Error("Não foi possível carregar suas necessidades.");

  return {
    supplier: supplierRes.data,
    buyer: buyerRes.data,
    received: (receivedRes.data ?? []) as unknown as InquiryRow[],
    sent: (sentRes.data ?? []) as unknown as InquiryRow[],
    needs: (needsRes.data ?? []) as unknown as NeedRow[],
  };
}

export default async function InquiriesPage({ searchParams }: InquiriesPageProps) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const params = await searchParams;
  const data = await getQuoteCenterData(authData.user.id);
  const canBuy = Boolean(data.buyer);
  const canSell = Boolean(data.supplier);
  const tabs = visibleTabs(canSell, canBuy);
  const activeTab = normalizeTab(params.tab, tabs);
  const activeCopy = TAB_COPY[activeTab];

  const metrics: { label: string; value: number; icon: React.ElementType; muted?: boolean }[] = [
    ...(canSell ? [{ label: "Recebidas", value: data.received.length, icon: MessageSquare }] : []),
    ...(canBuy ? [{ label: "Enviadas", value: data.sent.length, icon: ClipboardList }] : []),
    ...(canBuy ? [{ label: "Necessidades", value: data.needs.length, icon: PackageSearch }] : []),
    ...(canBuy ? [{ label: "Pesquisas", value: 0, icon: Search, muted: true }] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Central de Cotações</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {canSell && canBuy
              ? "Gerencie cotações recebidas e enviadas, e publique necessidades separadamente."
              : canSell
              ? "Area do fornecedor: visualize cotações direcionadas e cotações abertas gerais."
              : "Area do comprador: acompanhe cotações enviadas e publique necessidades quando nao encontrar o produto."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canBuy && (
            <>
              <Button render={<Link href="/painel/inquiries/nova-cotacao" />} className="btn-primary rounded-xl h-10 px-4 gap-2 text-sm font-semibold">
                <Plus className="w-4 h-4" />
                Criar nova cotacao
              </Button>
              <Button variant="outline" render={<Link href="/painel/inquiries/nova" />}>
                Publicar necessidade
              </Button>
            </>
          )}

          {!canBuy && (
            <Button variant="outline" render={<Link href="/painel/explorar" />}>
              Explorar fornecedores
            </Button>
          )}
        </div>
      </div>

      {metrics.length > 0 && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
              muted={metric.muted}
            />
          ))}
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto rounded-lg border border-border bg-white p-1" aria-label="Secoes de cotacoes">
        {tabs.map((tab) => {
          const Icon = TAB_COPY[tab].icon;
          const isActive = tab === activeTab;
          return (
            <Link
              key={tab}
              href={`/painel/inquiries?tab=${tab}`}
              className={cn(
                "flex min-w-fit items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {TAB_COPY[tab].label}
            </Link>
          );
        })}
      </nav>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{activeCopy.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{activeCopy.description}</p>
        </div>

        {activeTab === "received" && (
          data.supplier ? (
            <InquiryList
              inquiries={data.received}
              emptyTitle="Nenhuma cotação recebida por enquanto"
              emptyDescription="Mantenha seu perfil e seus produtos atualizados para melhorar o alcance das cotações."
              getDisplay={(inq) => getSupplierDisplay(inq, data.supplier as SupplierRow)}
            />
          ) : (
            <UnavailableState
              title="Perfil de fornecedor nao encontrado"
              description="Esta aba aparece quando sua conta possui perfil de fornecedor."
            />
          )
        )}

        {activeTab === "sent" && (
          data.buyer ? (
            <InquiryList
              inquiries={data.sent}
              emptyTitle="Nenhuma cotacao enviada por enquanto"
              emptyDescription="Use o botao Criar nova cotacao para abrir uma cotacao."
              emptyAction={
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Button render={<Link href="/painel/inquiries/nova-cotacao" />} className="btn-primary rounded-lg gap-2">
                    <Plus className="w-4 h-4" /> Criar nova cotacao
                  </Button>
                  <Button variant="outline" render={<Link href="/painel/inquiries/nova" />}>
                    Publicar necessidade
                  </Button>
                </div>
              }
              getDisplay={getBuyerDisplay}
            />
          ) : (
            <UnavailableState
              title="Perfil de comprador nao encontrado"
              description="Esta aba aparece quando sua conta possui perfil de comprador."
            />
          )
        )}

        {activeTab === "research" && (
          <RoadmapState
            title="Pesquisa profunda"
            description="Monte uma pesquisa comparativa com multiplos fornecedores, criterios e historico de decisao."
            actionLabel="Ir para Explorar"
            actionHref="/painel/explorar"
          />
        )}

        {activeTab === "needs" && (
          data.buyer ? (
            <NeedList
              needs={data.needs}
              emptyAction={(
                <Button variant="outline" render={<Link href="/painel/inquiries/nova" />}>
                  Publicar necessidade
                </Button>
              )}
            />
          ) : (
            <UnavailableState
              title="Perfil de comprador nao encontrado"
              description="Esta aba aparece quando sua conta possui perfil de comprador."
            />
          )
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  muted = false,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  muted?: boolean;
}) {
  return (
    <Card className={muted ? "border-dashed bg-slate-50/60" : undefined}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        </div>
        <Icon className={cn("h-5 w-5", muted ? "text-slate-300" : "text-[color:var(--brand-green-600)]")} />
      </CardContent>
    </Card>
  );
}

function NeedList({
  needs,
  emptyAction,
}: {
  needs: NeedRow[];
  emptyAction?: React.ReactNode;
}) {
  if (needs.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 py-12 text-center">
          <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="font-medium text-muted-foreground">Nenhuma necessidade publicada por enquanto</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Use este fluxo quando o produto ainda nao existir na plataforma. O time admin acompanha por aqui.
          </p>
          {emptyAction}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {needs.map((need) => {
        const info = needStatusInfo(need.status);
        const wasUpdated = hasNeedUpdate(need);
        return (
          <Card key={need.id} className="transition-shadow hover:shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{need.query}</p>
                  <Badge variant="outline" className={info.className}>
                    {info.label}
                  </Badge>
                  {wasUpdated && (
                    <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                      Atualizado
                    </Badge>
                  )}
                </div>

                {need.description && <p className="text-sm text-foreground">{need.description}</p>}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Solicitada em {formatDate(need.created_at)}</span>
                  {wasUpdated && <span>Ultima atualizacao {formatDate(need.updated_at)}</span>}
                </div>

                {need.admin_notes && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Observacao do admin: {need.admin_notes}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function InquiryList({
  inquiries,
  emptyTitle,
  emptyDescription,
  emptyAction,
  getDisplay,
}: {
  inquiries: InquiryRow[];
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  getDisplay: (inquiry: InquiryRow) => { title: string; subtitle: string; locked: boolean };
}) {
  if (inquiries.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 py-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="font-medium text-muted-foreground">{emptyTitle}</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{emptyDescription}</p>
          {emptyAction}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {inquiries.map((inquiry) => {
        const info = statusInfo(inquiry.status);
        const display = getDisplay(inquiry);
        return (
          <Card key={inquiry.id} className="transition-shadow hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{display.title}</p>
                    {display.locked && <Lock className="h-3.5 w-3.5 text-foreground" />}
                    <Badge variant="outline" className={info.className}>
                      {info.label}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">{display.subtitle}</p>
                  <p className="line-clamp-2 text-sm text-foreground">{inquiry.description}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {inquiry.products?.name && <span>Produto: {inquiry.products.name}</span>}
                    {inquiry.quantity_estimate && <span>Quantidade: {inquiry.quantity_estimate}</span>}
                    {inquiry.desired_deadline && <span>Prazo: {inquiry.desired_deadline}</span>}
                    {locationLabel(inquiry) && <span>Local: {locationLabel(inquiry)}</span>}
                    <span>{formatDate(inquiry.created_at)}</span>
                  </div>
                </div>

                <Button variant="ghost" size="sm" render={<Link href={`/painel/inquiries/${inquiry.id}`} />}>
                  Ver detalhes
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function RoadmapState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--brand-green-100)]">
            <Brain className="h-5 w-5 text-[color:var(--brand-green-700)]" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{title}</p>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button variant="outline" render={<Link href={actionHref} />}>
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function UnavailableState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-6 text-center">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
