import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Detalhes da Cotacao - Admin" };
export const dynamic = "force-dynamic";

type InquiryStatus = "new" | "viewed" | "responded" | "archived" | "reported";
type ContactType = "fabricante" | "importador" | "atacado" | null;

interface QuoteDetailsRow {
  id: string;
  buyer_id: string | null;
  inquiry_type: "directed" | "generic";
  description: string;
  quantity_estimate: string | null;
  target_price: string | null;
  contact_type: ContactType;
  status: InquiryStatus;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_company: string | null;
  buyer_city: string | null;
  buyer_state: string | null;
  created_at: string;
  updated_at: string | null;
}

interface BuyerRow {
  id: string;
  cnpj: string | null;
  company_name: string | null;
  email: string;
  phone: string | null;
}

interface ConversationRow {
  id: string;
}

interface ProposalRow {
  id: string;
  supplier_id: string;
  conversation_id: string;
  product_name: string;
  quantity: number;
  unit: string | null;
  target_price_cents: number | null;
  max_budget_cents: number | null;
  delivery_deadline: string | null;
  payment_terms: string | null;
  notes: string | null;
  status: string;
  refusal_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface SupplierRow {
  id: string;
  trade_name: string;
  company_name: string;
  city: string | null;
  state: string | null;
}

export default async function AdminQuoteDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: quoteData } = await adminClient
    .from("inquiries")
    .select(
      "id, buyer_id, inquiry_type, description, quantity_estimate, target_price, contact_type, status, buyer_name, buyer_email, buyer_phone, buyer_company, buyer_city, buyer_state, created_at, updated_at"
    )
    .eq("id", id)
    .eq("inquiry_type", "generic")
    .maybeSingle<QuoteDetailsRow>();

  if (!quoteData) notFound();

  const quote = quoteData as QuoteDetailsRow;
  const parsed = parseQuoteDescription(quote.description);

  const [buyerRes, conversationsRes] = await Promise.all([
    quote.buyer_id
      ? adminClient
          .from("buyers")
          .select("id, cnpj, company_name, email, phone")
          .eq("id", quote.buyer_id)
          .maybeSingle<BuyerRow>()
      : Promise.resolve({ data: null }),
    adminClient.from("conversations").select("id").eq("inquiry_id", quote.id),
  ]);

  const conversations = (conversationsRes.data ?? []) as ConversationRow[];
  const conversationIds = conversations.map((conversation) => conversation.id);

  const proposalsRes = conversationIds.length
    ? await adminClient
        .from("proposals")
        .select(
          "id, supplier_id, conversation_id, product_name, quantity, unit, target_price_cents, max_budget_cents, delivery_deadline, payment_terms, notes, status, refusal_reason, created_at, updated_at"
        )
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const proposals = (proposalsRes.data ?? []) as ProposalRow[];
  const supplierIds = [...new Set(proposals.map((proposal) => proposal.supplier_id))];

  const suppliersRes = supplierIds.length
    ? await adminClient
        .from("suppliers")
        .select("id, trade_name, company_name, city, state")
        .in("id", supplierIds)
    : { data: [] };
  const suppliers = (suppliersRes.data ?? []) as SupplierRow[];
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" render={<Link href="/admin/cotacoes" />}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar para Cotações
          </Button>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Detalhes da cotação</h1>
          <p className="text-sm text-slate-500">ID {quote.id}</p>
        </div>
        <Badge variant="outline" className={statusBadgeClass(quote.status)}>
          {statusLabel(quote.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Dados da cotação</h2>
            <InfoGrid
              items={[
                { label: "Produto/material", value: parsed.productName },
                { label: "Categoria", value: parsed.categoryName ?? "-" },
                { label: "Quantidade estimada", value: quote.quantity_estimate ?? "-" },
                { label: "Preco alvo", value: quote.target_price ?? "-" },
                { label: "Tipo de fornecedor", value: contactTypeLabel(quote.contact_type) },
                { label: "Cidade", value: quote.buyer_city ?? "-" },
                { label: "Estado", value: quote.buyer_state ?? "-" },
                { label: "Criada em", value: formatDateTime(quote.created_at) },
                { label: "Ultima atualizacao", value: formatDateTime(quote.updated_at ?? quote.created_at) },
              ]}
            />
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Descrição completa</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{quote.description}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Dados do comprador</h2>
            <InfoGrid
              items={[
                { label: "Nome", value: quote.buyer_name ?? "-" },
                { label: "Email", value: quote.buyer_email ?? buyerRes.data?.email ?? "-" },
                { label: "Telefone", value: quote.buyer_phone ?? buyerRes.data?.phone ?? "-" },
                {
                  label: "Empresa",
                  value: quote.buyer_company ?? buyerRes.data?.company_name ?? "-",
                },
                { label: "CNPJ", value: buyerRes.data?.cnpj ? formatDocument(buyerRes.data.cnpj) : "-" },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Propostas recebidas</h2>
            <Badge variant="outline">{proposals.length}</Badge>
          </div>

          {proposals.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma proposta recebida para esta cotacao.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs font-medium uppercase tracking-wide">
                    <th className="text-left px-3 py-2">Fornecedor</th>
                    <th className="text-left px-3 py-2">Produto</th>
                    <th className="text-left px-3 py-2">Quantidade</th>
                    <th className="text-left px-3 py-2">Preco alvo</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Criacao</th>
                    <th className="text-left px-3 py-2">Atualizacao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {proposals.map((proposal) => {
                    const supplier = supplierById.get(proposal.supplier_id);
                    return (
                      <tr key={proposal.id} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-900">
                            {supplier?.trade_name ?? supplier?.company_name ?? "Fornecedor"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {[supplier?.city, supplier?.state].filter(Boolean).join(" - ") || "-"}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{proposal.product_name}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {proposal.quantity}
                          {proposal.unit ? ` ${proposal.unit}` : ""}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {formatCents(proposal.target_price_cents)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline">{proposal.status}</Badge>
                        </td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                          {formatDateTime(proposal.created_at)}
                        </td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                          {formatDateTime(proposal.updated_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function parseQuoteDescription(description: string) {
  const productMatch = description.match(/Produto\/material:\s*([^\n.]+)/i);
  const categoryMatch = description.match(/Categoria:\s*([^\n.]+)/i);

  const productName = productMatch?.[1]?.trim() || description.split("\n")[0] || "Cotacao sem titulo";
  const categoryName = categoryMatch?.[1]?.trim() || null;

  return { productName, categoryName };
}

function contactTypeLabel(value: ContactType) {
  if (!value) return "Qualquer um";
  if (value === "fabricante") return "Fabricante";
  if (value === "importador") return "Importador";
  return "Atacado";
}

function statusLabel(status: InquiryStatus) {
  if (status === "new") return "Aberta";
  if (status === "viewed") return "Em andamento";
  if (status === "responded") return "Respondida";
  if (status === "archived") return "Fechada";
  return "Cancelada";
}

function statusBadgeClass(status: InquiryStatus) {
  if (status === "new") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "viewed") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "responded") return "bg-slate-100 text-slate-700 border-slate-200";
  if (status === "archived") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCents(value: number | null) {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function formatDocument(document: string) {
  const digits = document.replace(/\D/g, "");
  if (digits.length !== 14) return document;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function InfoGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 p-3 bg-white">
          <p className="text-xs font-semibold uppercase text-slate-500">{item.label}</p>
          <p className="mt-1 text-sm text-slate-800">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
