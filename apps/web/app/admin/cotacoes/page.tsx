import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Cotacoes - Admin" };
export const dynamic = "force-dynamic";

type InquiryStatus = "new" | "viewed" | "responded" | "archived" | "reported";
type ContactType = "fabricante" | "importador" | "atacado" | null;
type ProposalFilter = "all" | "with" | "without";
type SupplierTypeFilter = "all" | "qualquer" | "fabricante" | "importador" | "atacado";

interface QuoteRow {
  id: string;
  buyer_id: string | null;
  description: string;
  quantity_estimate: string | null;
  target_price: string | null;
  category_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_company: string | null;
  buyer_city: string | null;
  buyer_state: string | null;
  contact_type: ContactType;
  status: InquiryStatus;
  created_at: string;
  updated_at: string | null;
}

interface ConversationRow {
  id: string;
  inquiry_id: string | null;
}

interface ProposalRow {
  conversation_id: string;
}

interface SearchParamsShape {
  page?: string;
  q?: string;
  status?: string;
  category?: string;
  state?: string;
  city?: string;
  supplier_type?: string;
  start_date?: string;
  end_date?: string;
  proposals?: string;
}

interface EnrichedQuoteRow extends QuoteRow {
  product_name: string;
  category_name: string | null;
  proposal_count: number;
}

const PAGE_SIZE = 20;
const MAX_QUOTES_FETCH = 1000;
const STATUS_OPTIONS: Array<{ value: "all" | InquiryStatus; label: string }> = [
  { value: "all", label: "Todos os status" },
  { value: "new", label: "Aberta (new)" },
  { value: "viewed", label: "Em andamento (viewed)" },
  { value: "responded", label: "Respondida (responded)" },
  { value: "archived", label: "Fechada (archived)" },
  { value: "reported", label: "Cancelada (reported)" },
];

const SUPPLIER_TYPE_OPTIONS: Array<{ value: SupplierTypeFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "qualquer", label: "Qualquer um" },
  { value: "fabricante", label: "Fabricante" },
  { value: "importador", label: "Importador" },
  { value: "atacado", label: "Atacado" },
];

const PROPOSAL_OPTIONS: Array<{ value: ProposalFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "with", label: "Com propostas" },
  { value: "without", label: "Sem propostas" },
];

export default async function AdminCotacoesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInteger(params.page, 1));
  const queryText = sanitize(params.q);
  const status = normalizeStatus(params.status);
  const category = sanitize(params.category);
  const state = sanitize(params.state).toUpperCase();
  const city = sanitize(params.city);
  const supplierType = normalizeSupplierType(params.supplier_type);
  const startDate = sanitize(params.start_date);
  const endDate = sanitize(params.end_date);
  const proposals = normalizeProposalsFilter(params.proposals);

  const adminClient = createAdminClient();

  let query = adminClient
    .from("inquiries")
    .select(
      "id, buyer_id, description, quantity_estimate, target_price, category_id, buyer_name, buyer_email, buyer_company, buyer_city, buyer_state, contact_type, status, created_at, updated_at"
    )
    .eq("inquiry_type", "generic")
    .order("created_at", { ascending: false })
    .limit(MAX_QUOTES_FETCH);

  if (status !== "all") query = query.eq("status", status);
  if (state) query = query.eq("buyer_state", state);
  if (city) query = query.ilike("buyer_city", `%${city}%`);
  if (supplierType === "qualquer") query = query.is("contact_type", null);
  if (supplierType !== "all" && supplierType !== "qualquer") query = query.eq("contact_type", supplierType);
  if (startDate) query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
  if (endDate) query = query.lte("created_at", `${endDate}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Falha ao carregar cotações: ${error.message}`);
  }

  const baseRows = (data ?? []) as QuoteRow[];
  const proposalCountByInquiryId = await getProposalCountByInquiryId(
    adminClient,
    baseRows.map((row) => row.id)
  );

  const enrichedRows: EnrichedQuoteRow[] = baseRows.map((row) => {
    const parsed = parseQuoteDescription(row.description);
    return {
      ...row,
      product_name: parsed.productName,
      category_name: parsed.categoryName,
      proposal_count: proposalCountByInquiryId.get(row.id) ?? 0,
    };
  });

  let filtered = enrichedRows;

  if (queryText) {
    filtered = filtered.filter((row) => {
      const haystack = [
        row.product_name,
        row.category_name,
        row.buyer_name,
        row.buyer_email,
        row.buyer_city,
        row.buyer_company,
        row.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(queryText.toLowerCase());
    });
  }

  if (category) {
    filtered = filtered.filter((row) =>
      (row.category_name ?? "").toLowerCase().includes(category.toLowerCase())
    );
  }

  if (proposals === "with") {
    filtered = filtered.filter((row) => row.proposal_count > 0);
  } else if (proposals === "without") {
    filtered = filtered.filter((row) => row.proposal_count === 0);
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const paginated = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Cotações</h1>
        <p className="text-sm text-slate-500">
          Acompanhe todas as cotações criadas pelos compradores e as propostas recebidas pelos fornecedores.
        </p>
      </header>

      <Card>
        <CardContent className="p-4 space-y-4">
          <form method="get" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="xl:col-span-2">
              <label htmlFor="q" className="block text-xs font-semibold text-slate-600 mb-1">
                Busca textual
              </label>
              <input
                id="q"
                name="q"
                defaultValue={queryText}
                placeholder="Buscar por produto, comprador, cidade ou categoria..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <FilterSelect
              id="status"
              label="Status da cotacao"
              defaultValue={status}
              options={STATUS_OPTIONS}
            />

            <FilterSelect
              id="supplier_type"
              label="Tipo de fornecedor"
              defaultValue={supplierType}
              options={SUPPLIER_TYPE_OPTIONS}
            />

            <FilterInput id="category" label="Categoria" defaultValue={category} placeholder="Ex: Alimentos" />
            <FilterInput id="state" label="Estado (UF)" defaultValue={state} placeholder="Ex: BA" />
            <FilterInput id="city" label="Cidade" defaultValue={city} placeholder="Ex: Salvador" />

            <FilterSelect
              id="proposals"
              label="Propostas recebidas"
              defaultValue={proposals}
              options={PROPOSAL_OPTIONS}
            />

            <FilterInput id="start_date" label="Criacao (de)" defaultValue={startDate} type="date" />
            <FilterInput id="end_date" label="Criacao (ate)" defaultValue={endDate} type="date" />

            <div className="xl:col-span-4 flex flex-wrap items-center gap-2 pt-1">
              <Button type="submit" className="h-10">
                Aplicar filtros
              </Button>
              <Button type="button" variant="outline" render={<Link href="/admin/cotacoes" />}>
                Limpar filtros
              </Button>
              <span className="text-xs text-slate-500">
                {total} cotação(ões) encontrada(s)
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs font-medium uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Produto/material</th>
                  <th className="text-left px-4 py-3">Comprador</th>
                  <th className="text-left px-4 py-3">Quantidade</th>
                  <th className="text-left px-4 py-3">Preço alvo</th>
                  <th className="text-left px-4 py-3">Categoria</th>
                  <th className="text-left px-4 py-3">Local</th>
                  <th className="text-left px-4 py-3">Fornecedor</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Propostas</th>
                  <th className="text-left px-4 py-3">Criacao</th>
                  <th className="text-left px-4 py-3">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-10 text-center text-slate-400">
                      Nenhuma cotação encontrada para os filtros selecionados.
                    </td>
                  </tr>
                )}

                {paginated.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-900 font-medium">{quote.product_name}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <p className="font-medium text-slate-900">{quote.buyer_name ?? "-"}</p>
                      <p className="text-xs text-slate-500">{quote.buyer_email ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{quote.quantity_estimate ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{quote.target_price ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{quote.category_name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {[quote.buyer_city, quote.buyer_state].filter(Boolean).join(" - ") || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <Badge variant="outline">{contactTypeLabel(quote.contact_type)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusBadgeClass(quote.status)}>
                        {statusLabel(quote.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">{quote.proposal_count}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(quote.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={`/admin/cotacoes/${quote.id}`} />}
                      >
                        Ver detalhes
                      </Button>
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
          <span className="text-slate-500">
            Pagina {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/admin/cotacoes?${buildPageQuery(params, page - 1)}`} />}
              >
                Anterior
              </Button>
            )}
            {page < totalPages && (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/admin/cotacoes?${buildPageQuery(params, page + 1)}`} />}
              >
                Proxima
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

async function getProposalCountByInquiryId(
  adminClient: ReturnType<typeof createAdminClient>,
  inquiryIds: string[]
) {
  const counts = new Map<string, number>();
  if (inquiryIds.length === 0) return counts;

  const { data: conversations } = await adminClient
    .from("conversations")
    .select("id, inquiry_id")
    .in("inquiry_id", inquiryIds);

  const conversationRows = (conversations ?? []) as ConversationRow[];
  if (conversationRows.length === 0) return counts;

  const conversationIds = conversationRows.map((row) => row.id);
  const inquiryByConversationId = new Map<string, string>();
  for (const row of conversationRows) {
    if (row.inquiry_id) inquiryByConversationId.set(row.id, row.inquiry_id);
  }

  const { data: proposals } = await adminClient
    .from("proposals")
    .select("conversation_id")
    .in("conversation_id", conversationIds);

  for (const proposal of (proposals ?? []) as ProposalRow[]) {
    const inquiryId = inquiryByConversationId.get(proposal.conversation_id);
    if (!inquiryId) continue;
    counts.set(inquiryId, (counts.get(inquiryId) ?? 0) + 1);
  }

  return counts;
}

function parseQuoteDescription(description: string) {
  const productMatch = description.match(/Produto\/material:\s*([^\n.]+)/i);
  const categoryMatch = description.match(/Categoria:\s*([^\n.]+)/i);

  const productName = productMatch?.[1]?.trim() || description.split("\n")[0] || "Cotacao sem titulo";
  const categoryName = categoryMatch?.[1]?.trim() || null;

  return { productName, categoryName };
}

function parseInteger(value: string | undefined, fallback: number) {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

function sanitize(value: string | undefined) {
  return (value ?? "").trim();
}

function normalizeStatus(value: string | undefined): "all" | InquiryStatus {
  const allowed: Array<InquiryStatus> = ["new", "viewed", "responded", "archived", "reported"];
  return allowed.includes(value as InquiryStatus) ? (value as InquiryStatus) : "all";
}

function normalizeSupplierType(value: string | undefined): SupplierTypeFilter {
  const allowed: SupplierTypeFilter[] = ["all", "qualquer", "fabricante", "importador", "atacado"];
  return allowed.includes(value as SupplierTypeFilter) ? (value as SupplierTypeFilter) : "all";
}

function normalizeProposalsFilter(value: string | undefined): ProposalFilter {
  const allowed: ProposalFilter[] = ["all", "with", "without"];
  return allowed.includes(value as ProposalFilter) ? (value as ProposalFilter) : "all";
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

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildPageQuery(params: SearchParamsShape, page: number) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value || key === "page") continue;
    q.set(key, value);
  }
  q.set("page", String(page));
  return q.toString();
}

function FilterInput({
  id,
  label,
  defaultValue,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  type?: "text" | "date";
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
      </label>
      <input
        id={id}
        name={id}
        defaultValue={defaultValue}
        type={type}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}

function FilterSelect({
  id,
  label,
  defaultValue,
  options,
}: {
  id: string;
  label: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
      </label>
      <select
        id={id}
        name={id}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
