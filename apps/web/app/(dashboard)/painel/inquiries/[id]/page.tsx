import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock, MessageSquare, Send, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { startSupplierConversation } from "@/app/actions/inquiries";

type InquiryStatus = "new" | "viewed" | "responded" | "archived" | "reported";
type SupplierPlan = "free" | "starter" | "pro" | "premium";

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
  buyer_id: string | null;
  inquiry_type: "directed" | "generic" | null;
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
  products?: { name: string | null; slug: string | null } | null;
  suppliers?: { trade_name: string | null; slug: string | null; plan: SupplierPlan | null } | null;
  buyer_profile?: { is_company_verified: boolean } | null;
}

interface InquiryPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  buyer_orphan:
    "Este comprador nao esta mais ativo na plataforma. Nao e possivel iniciar uma negociacao.",
  no_supplier_profile:
    "Voce precisa ter um perfil de fornecedor para iniciar uma negociacao.",
  inquiry_not_found: "Cotacao nao encontrada.",
  not_authorized: "Voce nao tem permissao para responder esta cotacao.",
  conversation_insert_failed:
    "Nao foi possivel abrir o chat. Tente novamente em instantes.",
};

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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function locationLabel(inquiry: InquiryRow) {
  return [inquiry.buyer_city, inquiry.buyer_state].filter(Boolean).join(" - ") || "Nao informado";
}

async function getInquiry(userId: string, id: string) {
  const supabase = await createClient();

  const [supplierRes, buyerRes] = await Promise.all([
    supabase.from("suppliers").select("id, plan").eq("user_id", userId).maybeSingle<SupplierRow>(),
    supabase.from("buyers").select("id").eq("user_id", userId).maybeSingle<BuyerRow>(),
  ]);

  const { data, error } = await supabase
    .from("inquiries")
    .select(`
      id,
      supplier_id,
      product_id,
      buyer_id,
      inquiry_type,
      description,
      quantity_estimate,
      desired_deadline,
      target_price,
      contact_type,
      status,
      buyer_name,
      buyer_email,
      buyer_phone,
      buyer_company,
      buyer_city,
      buyer_state,
      contact_unlocked,
      created_at,
      products(name, slug),
      suppliers(trade_name, slug, plan)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const inquiry = data as unknown as InquiryRow;

  if (inquiry.buyer_id) {
    const verifyRes = await supabase
      .from("buyers")
      .select("is_company_verified")
      .eq("id", inquiry.buyer_id)
      .maybeSingle<{ is_company_verified: boolean }>();
    if (verifyRes.data?.is_company_verified) {
      inquiry.buyer_profile = { is_company_verified: true };
    }
  }

  const isSupplierViewer = Boolean(
    supplierRes.data &&
      (inquiry.inquiry_type === "generic" ||
        (inquiry.inquiry_type === "directed" && inquiry.supplier_id === supplierRes.data.id))
  );
  const isBuyerViewer = Boolean(buyerRes.data && inquiry.buyer_id === buyerRes.data.id);

  if (!isSupplierViewer && !isBuyerViewer) return null;

  return {
    inquiry,
    mode: isSupplierViewer ? ("supplier" as const) : ("buyer" as const),
    supplier: supplierRes.data,
    isDirected: inquiry.inquiry_type === "directed",
  };
}

export default async function InquiryDetailPage({ params, searchParams }: InquiryPageProps) {
  const { id } = await params;
  const { error: errorCode } = await searchParams;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const data = await getInquiry(authData.user.id, id);
  if (!data) notFound();

  const { inquiry, isDirected } = data;
  const info = statusInfo(inquiry.status);
  const canShowContact =
    data.mode === "buyer" ||
    Boolean(data.supplier && data.supplier.plan !== "free" && inquiry.contact_unlocked);
  const isOrphan = inquiry.buyer_id === null;
  const canSupplierAct = data.mode === "supplier" && !isOrphan && isDirected;
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" render={<Link href="/painel/inquiries" />}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="mt-3 text-2xl font-bold text-foreground">Detalhes da cotacao</h1>
          <p className="mt-1 text-sm text-muted-foreground">Recebida em {formatDate(inquiry.created_at)}</p>
        </div>
        <Badge variant="outline" className={info.className}>
          {info.label}
        </Badge>
      </div>

      {errorMessage && <div className="alert-error text-sm">{errorMessage}</div>}

      {isOrphan && data.mode === "supplier" && (
        <div className="alert-warning text-sm">
          Esta cotacao foi criada por um comprador que nao esta mais ativo na plataforma.
        </div>
      )}

      <Card>
        <CardContent className="space-y-6 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--brand-green-100)]">
              <MessageSquare className="h-5 w-5 text-[color:var(--brand-green-700)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Solicitacao</p>
              <p className="mt-1 whitespace-pre-wrap text-foreground">{inquiry.description}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoBlock label="Produto" value={inquiry.products?.name ?? "Nao informado"} />
            {isDirected && <InfoBlock label="Fornecedor" value={inquiry.suppliers?.trade_name ?? "Fornecedor"} />}
            <InfoBlock label="Quantidade estimada" value={inquiry.quantity_estimate ?? "Nao informada"} />
            {inquiry.target_price && <InfoBlock label="Preco alvo" value={inquiry.target_price} />}
            {inquiry.contact_type && <InfoBlock label="Tipo de fornecedor" value={inquiry.contact_type} />}
            <InfoBlock label="Prazo desejado" value={inquiry.desired_deadline ?? "Nao informado"} />
            <InfoBlock label="Cidade do comprador" value={locationLabel(inquiry)} />
          </div>
        </CardContent>
      </Card>

      {canSupplierAct && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Responda esta cotacao</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Iniciar uma conversa abre o chat com o comprador para negociacao e proposta.
              </p>
            </div>
            <form action={startSupplierConversation}>
              <input type="hidden" name="inquiry_id" value={inquiry.id} />
              <Button type="submit" className="btn-primary shrink-0">
                <Send className="mr-2 h-4 w-4" />
                Iniciar negociacao
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Contato do comprador</h2>
            {!canShowContact && <Lock className="h-4 w-4 text-foreground" />}
            {inquiry.buyer_profile?.is_company_verified && (
              <Badge
                variant="outline"
                className="gap-1 border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)]"
                title="CNPJ validado como ativo na Receita Federal"
              >
                <ShieldCheck className="h-3 w-3" />
                Empresa Verificada
              </Badge>
            )}
          </div>

          {canShowContact ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoBlock label="Nome" value={inquiry.buyer_name ?? "Nao informado"} />
              <InfoBlock label="Empresa" value={inquiry.buyer_company ?? "Nao informada"} />
              <InfoBlock label="Email" value={inquiry.buyer_email ?? "Nao informado"} />
              <InfoBlock label="Telefone" value={inquiry.buyer_phone ?? "Nao informado"} />
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Os dados de contato ficam ocultos para fornecedores do plano gratuito.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}
