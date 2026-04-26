import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Brain,
  ClipboardList,
  Globe,
  Lock,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Central de Cotações" };

type InquiryStatus = "new" | "viewed" | "responded" | "archived" | "reported";
type SupplierPlan = "free" | "starter" | "pro" | "premium";
type QuoteTab = "general" | "received" | "sent" | "research" | "analysis";

interface SupplierRow { id: string; plan: SupplierPlan }
interface BuyerRow    { id: string }

interface InquiryRow {
  id: string;
  supplier_id: string | null;
  product_id: string | null;
  description: string;
  quantity_estimate: string | null;
  desired_deadline: string | null;
  target_price: string | null;
  contact_type: string | null;
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

interface InquiriesPageProps {
  searchParams: Promise<{ tab?: string }>;
}

// GERAL is first so it's the default landing tab
const TAB_COPY: Record<QuoteTab, { label: string; description: string; icon: React.ElementType }> = {
  general: {
    label: "Geral",
    description: "Necessidades de compra abertas a todos os fornecedores cadastrados.",
    icon: Globe,
  },
  received: {
    label: "Recebidas",
    description: "Pedidos enviados diretamente para você ou seus produtos.",
    icon: MessageSquare,
  },
  sent: {
    label: "Enviadas",
    description: "Cotações que você enviou diretamente a fornecedores.",
    icon: ClipboardList,
  },
  research: {
    label: "Pesquisas",
    description: "Lista de pesquisas profundas de compra para comparar materiais e fornecedores.",
    icon: Search,
  },
  analysis: {
    label: "Análises",
    description: "Recomendações estruturadas por score e, futuramente, por inteligência artificial.",
    icon: Brain,
  },
};

const TAB_ORDER: QuoteTab[] = ["general", "received", "sent", "research", "analysis"];

function visibleTabs(hasSupplier: boolean, hasBuyer: boolean): QuoteTab[] {
  if (hasSupplier && hasBuyer) return ["general", "received", "sent", "research"];
  if (hasSupplier)             return ["general", "received"];
  if (hasBuyer)                return ["general", "sent"];
  return ["general"];
}

function normalizeTab(value: string | undefined, allowed: QuoteTab[]): QuoteTab {
  if (allowed.includes(value as QuoteTab)) return value as QuoteTab;
  return allowed[0];
}

function statusInfo(status: InquiryStatus | string) {
  const map: Record<string, { label: string; className: string }> = {
    new:       { label: "Nova",        className: "bg-[color:var(--brand-green-100)] text-[color:var(--brand-green-700)] border-[color:var(--brand-green-200)]" },
    viewed:    { label: "Visualizada", className: "bg-slate-100 text-slate-600 border-slate-200" },
    responded: { label: "Respondida",  className: "bg-slate-100 text-slate-600 border-slate-200" },
    archived:  { label: "Arquivada",   className: "bg-slate-100 text-slate-500 border-slate-200" },
    reported:  { label: "Denunciada",  className: "bg-destructive/10 text-destructive border-destructive/20" },
  };
  return map[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border-slate-200" };
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function locationLabel(inquiry: InquiryRow) {
  return [inquiry.buyer_city, inquiry.buyer_state].filter(Boolean).join(" - ");
}

const CONTACT_TYPE_LABELS: Record<string, string> = {
  fabricante: "Fabricante",
  importador: "Importador",
  atacado:    "Atacado",
};

function getSupplierDisplay(inquiry: InquiryRow, supplier: SupplierRow) {
  const canShowContact = supplier.plan !== "free" && inquiry.contact_unlocked;
  return {
    title: canShowContact ? inquiry.buyer_name ?? "Comprador" : "Dados de contato ocultos",
    subtitle: canShowContact
      ? [inquiry.buyer_company, inquiry.buyer_email, inquiry.buyer_phone].filter(Boolean).join(" · ")
      : "Fornecedor gratuito vê a necessidade, quantidade, prazo e cidade. O contato fica reservado para planos pagos.",
    locked: !canShowContact,
  };
}

function getBuyerDisplay(inquiry: InquiryRow) {
  return {
    title:    inquiry.suppliers?.trade_name ?? "Fornecedor",
    subtitle: inquiry.products?.name ?? "Cotação enviada",
    locked:   false,
  };
}

function parseProductFromDescription(description: string): string | null {
  const match = description.match(/^Produto:\s*([^|]+)/);
  return match ? match[1].trim() : null;
}

function getGenericDisplay(inquiry: InquiryRow) {
  const productName =
    inquiry.products?.name ??
    parseProductFromDescription(inquiry.description) ??
    null;
  const location = locationLabel(inquiry) || "Brasil";
  return {
    title:    productName ?? inquiry.buyer_company ?? inquiry.buyer_name ?? "Necessidade de compra",
    subtitle: location,
    locked:   false,
  };
}

async function getQuoteCenterData(userId: string) {
  const supabase = await createClient();

  const [supplierRes, buyerRes] = await Promise.all([
    supabase.from("suppliers").select("id, plan").eq("user_id", userId).maybeSingle<SupplierRow>(),
    supabase.from("buyers").select("id").eq("user_id", userId).maybeSingle<BuyerRow>(),
  ]);

  const [receivedRes, sentRes, genericRes] = await Promise.all([
    supplierRes.data
      ? supabase
          .from("inquiries")
          .select(`id, supplier_id, product_id, description, quantity_estimate, desired_deadline,
                   status, buyer_name, buyer_email, buyer_phone,
                   buyer_company, buyer_city, buyer_state, contact_unlocked, created_at, products(name)`)
          .eq("supplier_id", supplierRes.data.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),

    buyerRes.data
      ? supabase
          .from("inquiries")
          .select(`id, supplier_id, product_id, description, quantity_estimate, desired_deadline,
                   status, buyer_name, buyer_email, buyer_phone,
                   buyer_company, buyer_city, buyer_state, contact_unlocked, created_at,
                   products(name), suppliers(trade_name, slug)`)
          .eq("buyer_id", buyerRes.data.id)
          .eq("inquiry_type", "directed")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),

    // Generic query is best-effort — new columns may not exist yet before migration 018
    supabase
      .from("inquiries")
      .select(`id, supplier_id, product_id, description, quantity_estimate, target_price,
               status, buyer_name, buyer_company, buyer_city,
               buyer_state, contact_unlocked, created_at, products(name)`)
      .eq("inquiry_type", "generic")
      .not("status", "in", '("archived","reported")')
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (receivedRes.error) throw new Error("Não foi possível carregar as cotações recebidas.");
  if (sentRes.error)     throw new Error("Não foi possível carregar suas cotações enviadas.");

  return {
    supplier: supplierRes.data,
    buyer:    buyerRes.data,
    received: (receivedRes.data ?? []) as unknown as InquiryRow[],
    sent:     (sentRes.data     ?? []) as unknown as InquiryRow[],
    generic:  (genericRes.data  ?? []) as unknown as InquiryRow[],
  };
}

export default async function InquiriesPage({ searchParams }: InquiriesPageProps) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const params   = await searchParams;
  const data     = await getQuoteCenterData(authData.user.id);
  const tabs     = visibleTabs(!!data.supplier, !!data.buyer);
  const activeTab  = normalizeTab(params.tab, tabs);
  const activeCopy = TAB_COPY[activeTab];
  const canBuy     = !!data.buyer;
  const canSell    = !!data.supplier;

  // Metric cards filtered to what the user can see
  const metrics: { label: string; value: number; icon: React.ElementType; muted?: boolean }[] = [
    { label: "Geral",     value: data.generic.length,  icon: Globe },
    ...(canSell ? [{ label: "Recebidas", value: data.received.length, icon: MessageSquare }] : []),
    ...(canBuy  ? [{ label: "Enviadas",  value: data.sent.length,     icon: ClipboardList }] : []),
    ...(canBuy && canSell ? [{ label: "Pesquisas", value: 0, icon: Search, muted: true }] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Central de Cotações</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {canSell && canBuy
              ? "Gerencie cotações recebidas, enviadas e necessidades abertas do mercado."
              : canSell
              ? "Veja necessidades abertas de compradores e cotações recebidas para seus produtos."
              : "Publique necessidades de compra e acompanhe cotações enviadas."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canBuy && (
            <Button
              render={<Link href="/painel/inquiries/nova" />}
              className="btn-primary rounded-xl h-10 px-4 gap-2 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Nova cotação
            </Button>
          )}
          <Button variant="outline" render={<Link href="/painel/explorar" />}>
            Explorar fornecedores
          </Button>
        </div>
      </div>

      <div className={`grid gap-3 grid-cols-2 lg:grid-cols-${Math.min(metrics.length, 4)}`}>
        {metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} icon={m.icon} muted={m.muted} />
        ))}
      </div>

      <nav
        className="flex gap-2 overflow-x-auto rounded-lg border border-border bg-white p-1"
        aria-label="Seções de cotações"
      >
        {tabs.map((tab) => {
          const Icon     = TAB_COPY[tab].icon;
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{activeCopy.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{activeCopy.description}</p>
          </div>
          {activeTab === "sent" && canBuy && (
            <Button
              render={<Link href="/painel/inquiries/nova" />}
              className="btn-primary rounded-xl h-10 px-4 gap-2 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Nova cotação
            </Button>
          )}
          {activeTab === "general" && canBuy && (
            <Button
              render={<Link href="/painel/inquiries/nova" />}
              className="btn-primary rounded-xl h-10 px-4 gap-2 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Publicar necessidade
            </Button>
          )}
        </div>

        {/* ── GERAL ── */}
        {activeTab === "general" && (
          <GenericInquiryList
            inquiries={data.generic}
            isSupplier={!!data.supplier}
            isBuyer={!!data.buyer}
          />
        )}

        {/* ── RECEBIDAS ── */}
        {activeTab === "received" && (
          data.supplier ? (
            <InquiryList
              inquiries={data.received}
              emptyTitle="Nenhuma cotação recebida por enquanto"
              emptyDescription="Mantenha seu perfil e produtos atualizados para aparecer nas buscas dos compradores."
              getDisplay={(inq) => getSupplierDisplay(inq, data.supplier as SupplierRow)}
            />
          ) : (
            <UnavailableState
              title="Perfil de fornecedor não encontrado"
              description="Esta aba aparece quando sua conta também possui perfil de fornecedor."
            />
          )
        )}

        {/* ── ENVIADAS ── */}
        {activeTab === "sent" && (
          data.buyer ? (
            <InquiryList
              inquiries={data.sent}
              emptyTitle="Nenhuma cotação enviada por enquanto"
              emptyDescription="Use o botão Nova cotação para publicar uma necessidade de compra aberta, ou explore fornecedores e entre em contato diretamente."
              emptyAction={
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Button
                    render={<Link href="/painel/inquiries/nova" />}
                    className="btn-primary rounded-lg gap-2"
                  >
                    <Plus className="w-4 h-4" /> Nova cotação geral
                  </Button>
                  <Button variant="outline" render={<Link href="/painel/explorar" />}>
                    Explorar fornecedores
                  </Button>
                </div>
              }
              getDisplay={getBuyerDisplay}
            />
          ) : (
            <UnavailableState
              title="Perfil de comprador não encontrado"
              description="Esta aba aparece quando sua conta também possui perfil de comprador."
            />
          )
        )}

        {activeTab === "research" && (
          <RoadmapState
            title="Pesquisa profunda"
            description="Selecione vários produtos, configure critérios como material, quantidade, origem e frete, e compare ofertas lado a lado."
            actionLabel="Ir para Explorar"
            actionHref="/painel/explorar"
          />
        )}

        {activeTab === "analysis" && (
          <RoadmapState
            title="Análise de melhor proposta"
            description="Score determinístico e camada de IA explicando a melhor opção, riscos e contrapropostas sugeridas."
            actionLabel="Ver pesquisas"
            actionHref="/painel/inquiries?tab=research"
          />
        )}
      </section>
    </div>
  );
}

// ─── Components ───────────────────────────────────────────────────────────────

function MetricCard({
  label, value, icon: Icon, muted = false,
}: { label: string; value: number; icon: React.ElementType; muted?: boolean }) {
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

function GenericInquiryList({
  inquiries, isSupplier, isBuyer,
}: { inquiries: InquiryRow[]; isSupplier: boolean; isBuyer: boolean }) {
  if (inquiries.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 py-12 text-center">
          <Globe className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="font-medium text-muted-foreground">Nenhuma cotação pública por enquanto</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {isBuyer
              ? "Seja o primeiro a publicar uma necessidade de compra para que fornecedores entrem em contato."
              : "Quando compradores publicarem necessidades abertas, elas aparecerão aqui."}
          </p>
          {isBuyer && (
            <Button
              render={<Link href="/painel/inquiries/nova" />}
              className="btn-primary rounded-lg gap-2"
            >
              <Plus className="w-4 h-4" /> Publicar necessidade
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {inquiries.map((inquiry) => {
        const display = getGenericDisplay(inquiry);
        return (
          <Card key={inquiry.id} className="transition-shadow hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{display.title}</p>
                    {inquiry.contact_type && (
                      <Badge variant="outline" className="text-xs border-[color:var(--brand-green-200)] text-[color:var(--brand-green-700)]">
                        {CONTACT_TYPE_LABELS[inquiry.contact_type] ?? inquiry.contact_type}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {inquiry.quantity_estimate && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        Qtd: {inquiry.quantity_estimate}
                      </span>
                    )}
                    {inquiry.target_price && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[color:var(--brand-green-50)] border border-[color:var(--brand-green-200)] text-[color:var(--brand-green-700)]">
                        Alvo: {inquiry.target_price}
                      </span>
                    )}
                    {display.subtitle && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        📍 {display.subtitle}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{inquiry.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(inquiry.created_at)}</p>
                </div>
                {isSupplier && (
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/painel/inquiries/${inquiry.id}`} />}
                    className="shrink-0 border-[color:var(--brand-green-200)] text-[color:var(--brand-green-700)] hover:bg-[color:var(--brand-green-50)]"
                  >
                    Tenho interesse
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
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
  inquiries, emptyTitle, emptyDescription, emptyAction, getDisplay,
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
        const info    = statusInfo(inquiry.status);
        const display = getDisplay(inquiry);
        return (
          <Card key={inquiry.id} className="transition-shadow hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{display.title}</p>
                    {display.locked && <Lock className="h-3.5 w-3.5 text-amber-600" />}
                    <Badge variant="outline" className={info.className}>{info.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{display.subtitle}</p>
                  <p className="line-clamp-2 text-sm text-foreground">{inquiry.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {inquiry.quantity_estimate && <span>Quantidade: {inquiry.quantity_estimate}</span>}
                    {inquiry.desired_deadline  && <span>Prazo: {inquiry.desired_deadline}</span>}
                    {locationLabel(inquiry)    && <span>Local: {locationLabel(inquiry)}</span>}
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
  title, description, actionLabel, actionHref,
}: { title: string; description: string; actionLabel: string; actionHref: string }) {
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
        <Button variant="outline" render={<Link href={actionHref} />}>{actionLabel}</Button>
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
