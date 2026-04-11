import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Brain,
  ClipboardList,
  Lock,
  MessageSquare,
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
type QuoteTab = "received" | "sent" | "research" | "analysis";

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

interface InquiriesPageProps {
  searchParams: Promise<{ tab?: string }>;
}

const TAB_COPY: Record<QuoteTab, { label: string; description: string; icon: React.ElementType }> = {
  received: {
    label: "Recebidas",
    description: "Pedidos enviados por compradores para seus produtos e perfil.",
    icon: MessageSquare,
  },
  sent: {
    label: "Enviadas",
    description: "Solicitações e propostas que você enviou para fornecedores.",
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

function normalizeTab(value: string | undefined, fallback: QuoteTab): QuoteTab {
  if (value === "received" || value === "sent" || value === "research" || value === "analysis") return value;
  return fallback;
}

function statusInfo(status: InquiryStatus | string) {
  const map: Record<string, { label: string; className: string }> = {
    new: { label: "Nova", className: "bg-[color:var(--brand-green-100)] text-[color:var(--brand-green-700)] border-[color:var(--brand-green-200)]" },
    viewed: { label: "Visualizada", className: "bg-slate-100 text-slate-600 border-slate-200" },
    responded: { label: "Respondida", className: "bg-slate-100 text-slate-600 border-slate-200" },
    archived: { label: "Arquivada", className: "bg-slate-100 text-slate-500 border-slate-200" },
    reported: { label: "Denunciada", className: "bg-destructive/10 text-destructive border-destructive/20" },
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
    title: inquiry.suppliers?.trade_name ?? "Fornecedor",
    subtitle: inquiry.products?.name ?? "Cotação enviada",
    locked: false,
  };
}

async function getQuoteCenterData(userId: string) {
  const supabase = await createClient();

  const [supplierRes, buyerRes] = await Promise.all([
    supabase.from("suppliers").select("id, plan").eq("user_id", userId).maybeSingle<SupplierRow>(),
    supabase.from("buyers").select("id").eq("user_id", userId).maybeSingle<BuyerRow>(),
  ]);

  const [receivedRes, sentRes] = await Promise.all([
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
          .eq("supplier_id", supplierRes.data.id)
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
  ]);

  if (receivedRes.error) throw new Error("Não foi possível carregar as cotações recebidas.");
  if (sentRes.error) throw new Error("Não foi possível carregar suas cotações enviadas.");

  return {
    supplier: supplierRes.data,
    buyer: buyerRes.data,
    received: (receivedRes.data ?? []) as unknown as InquiryRow[],
    sent: (sentRes.data ?? []) as unknown as InquiryRow[],
  };
}

export default async function InquiriesPage({ searchParams }: InquiriesPageProps) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const params = await searchParams;
  const data = await getQuoteCenterData(authData.user.id);
  const fallbackTab: QuoteTab = data.supplier ? "received" : "sent";
  const activeTab = normalizeTab(params.tab, fallbackTab);
  const activeCopy = TAB_COPY[activeTab];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Central de Cotações</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Organize pedidos, propostas, negociações e pesquisas profundas em uma base estruturada para decisão de compra.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/painel" />}>
          Voltar ao painel
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Recebidas" value={data.received.length} icon={MessageSquare} />
        <MetricCard label="Enviadas" value={data.sent.length} icon={ClipboardList} />
        <MetricCard label="Pesquisas" value={0} icon={Search} muted />
        <MetricCard label="Análises" value={0} icon={BarChart3} muted />
      </div>

      <nav className="flex gap-2 overflow-x-auto rounded-lg border border-border bg-white p-1" aria-label="Seções de cotações">
        {(Object.keys(TAB_COPY) as QuoteTab[]).map((tab) => {
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
              emptyDescription="Cadastre produtos e mantenha o perfil completo para aparecer melhor nas buscas."
              emptyActionLabel="Adicionar produto"
              emptyActionHref="/painel/produtos/novo"
              getDisplay={(inquiry) => getSupplierDisplay(inquiry, data.supplier as SupplierRow)}
            />
          ) : (
            <UnavailableState title="Perfil de fornecedor não encontrado" description="Esta aba aparece quando sua conta também possui perfil de fornecedor." />
          )
        )}

        {activeTab === "sent" && (
          data.buyer ? (
            <InquiryList
              inquiries={data.sent}
              emptyTitle="Nenhuma cotação enviada por enquanto"
              emptyDescription="Explore fornecedores e envie sua primeira proposta quando encontrar uma boa opção."
              emptyActionLabel="Explorar fornecedores"
              emptyActionHref="/painel/explorar"
              getDisplay={getBuyerDisplay}
            />
          ) : (
            <UnavailableState title="Perfil de comprador não encontrado" description="Esta aba aparece quando sua conta também possui perfil de comprador." />
          )
        )}

        {activeTab === "research" && (
          <RoadmapState
            title="Pesquisa profunda"
            description="A próxima etapa é permitir que o comprador selecione vários produtos e configure critérios como material, quantidade, estoque, origem e frete."
            actionLabel="Ir para Explorar"
            actionHref="/painel/explorar"
          />
        )}

        {activeTab === "analysis" && (
          <RoadmapState
            title="Análise de melhor proposta"
            description="Aqui entrará o score determinístico e, depois, a camada de IA explicando melhor opção, riscos e contrapropostas sugeridas."
            actionLabel="Ver modelo documentado"
            actionHref="/painel/inquiries?tab=research"
          />
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

function InquiryList({
  inquiries,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  emptyActionHref,
  getDisplay,
}: {
  inquiries: InquiryRow[];
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel: string;
  emptyActionHref: string;
  getDisplay: (inquiry: InquiryRow) => { title: string; subtitle: string; locked: boolean };
}) {
  if (inquiries.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 py-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="font-medium text-muted-foreground">{emptyTitle}</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{emptyDescription}</p>
          <Button render={<Link href={emptyActionHref} />} className="btn-primary rounded-lg">
            {emptyActionLabel}
          </Button>
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
                    {display.locked && <Lock className="h-3.5 w-3.5 text-amber-600" />}
                    <Badge variant="outline" className={info.className}>{info.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{display.subtitle}</p>
                  <p className="line-clamp-2 text-sm text-foreground">{inquiry.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
