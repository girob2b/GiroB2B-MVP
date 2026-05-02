import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, PackageSearch, Users } from "lucide-react";

export const metadata = { title: "Admin - GiroB2B" };
export const dynamic = "force-dynamic";

type UserRole = "user" | "buyer" | "supplier" | "admin";

interface ProfileRow {
  id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
}

interface BuyerRow {
  user_id: string | null;
  name: string | null;
  email: string;
  company_name: string | null;
  company: string | null;
}

interface SupplierRow {
  user_id: string;
  company_name: string;
  trade_name: string;
  suspended: boolean;
}

interface InquiryRow {
  id: string;
  buyer_name: string | null;
  buyer_company: string | null;
  description: string;
  status: "new" | "viewed" | "responded" | "archived" | "reported";
  created_at: string;
  desired_deadline: string | null;
  deadline: string | null;
}

interface ConversationRow {
  id: string;
  inquiry_id: string | null;
}

interface ProposalRow {
  conversation_id: string;
}

interface SearchNeedRow {
  id: string;
  user_id: string;
  query: string;
  description: string | null;
  status: "pending" | "in_progress" | "fulfilled" | "registered" | "cadastrado" | "rejected";
  created_at: string;
  updated_at: string;
}

interface AuthUserRow {
  id: string;
  email: string | null;
}

const OPEN_INQUIRY_STATUS: InquiryRow["status"][] = ["new", "viewed", "responded"];
const NEEDS_STATUS_LABEL: Record<SearchNeedRow["status"], string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  fulfilled: "Cadastrado",
  registered: "Cadastrado",
  cadastrado: "Cadastrado",
  rejected: "Rejeitado",
};

const INQUIRY_STATUS_LABEL: Record<InquiryRow["status"], string> = {
  new: "Nova",
  viewed: "Visualizada",
  responded: "Respondida",
  archived: "Arquivada",
  reported: "Reportada",
};

export default async function AdminPage() {
  const adminClient = createAdminClient();

  const [
    userCountRes,
    openInquiriesCountRes,
    needsCountRes,
    profilesRes,
    openInquiriesRes,
    searchNeedsRes,
    authUsersRes,
  ] = await Promise.all([
    adminClient.from("user_profiles").select("id", { count: "exact", head: true }),
    adminClient
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .in("status", OPEN_INQUIRY_STATUS),
    adminClient.from("search_needs").select("id", { count: "exact", head: true }),
    adminClient
      .from("user_profiles")
      .select("id, role, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    adminClient
      .from("inquiries")
      .select("id, buyer_name, buyer_company, description, status, created_at, desired_deadline, deadline")
      .in("status", OPEN_INQUIRY_STATUS)
      .order("created_at", { ascending: false })
      .limit(20),
    adminClient
      .from("search_needs")
      .select("id, user_id, query, description, status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(20),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const profiles = ((profilesRes.data ?? []) as ProfileRow[]).filter((item) => Boolean(item.id));
  const openInquiries = (openInquiriesRes.data ?? []) as InquiryRow[];
  const searchNeeds = (searchNeedsRes.data ?? []) as SearchNeedRow[];
  const authUsers = (authUsersRes.data.users ?? []) as AuthUserRow[];

  const profileIds = profiles.map((profile) => profile.id);
  const needUserIds = [...new Set(searchNeeds.map((need) => need.user_id))];
  const usersForLookup = [...new Set([...profileIds, ...needUserIds])];

  const [buyersRes, suppliersRes, conversationsRes] = await Promise.all([
    usersForLookup.length
      ? adminClient
          .from("buyers")
          .select("user_id, name, email, company_name, company")
          .in("user_id", usersForLookup)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length
      ? adminClient
          .from("suppliers")
          .select("user_id, company_name, trade_name, suspended")
          .in("user_id", profileIds)
      : Promise.resolve({ data: [], error: null }),
    openInquiries.length
      ? adminClient
          .from("conversations")
          .select("id, inquiry_id")
          .in("inquiry_id", openInquiries.map((inquiry) => inquiry.id))
      : Promise.resolve({ data: [], error: null }),
  ]);

  const buyers = (buyersRes.data ?? []) as BuyerRow[];
  const suppliers = (suppliersRes.data ?? []) as SupplierRow[];
  const conversations = (conversationsRes.data ?? []) as ConversationRow[];

  const conversationIds = conversations.map((conversation) => conversation.id);
  const proposalsRes = conversationIds.length
    ? await adminClient.from("proposals").select("conversation_id").in("conversation_id", conversationIds)
    : { data: [], error: null };
  const proposals = (proposalsRes.data ?? []) as ProposalRow[];

  const userEmailById = new Map(authUsers.map((user) => [user.id, user.email ?? "-"]));
  const buyerByUserId = new Map(
    buyers
      .filter((buyer): buyer is BuyerRow & { user_id: string } => Boolean(buyer.user_id))
      .map((buyer) => [buyer.user_id, buyer])
  );
  const supplierByUserId = new Map(suppliers.map((supplier) => [supplier.user_id, supplier]));
  const publishedNeeds = searchNeeds;

  const inquiryByConversationId = new Map(
    conversations
      .filter((conversation): conversation is ConversationRow & { inquiry_id: string } =>
        Boolean(conversation.inquiry_id)
      )
      .map((conversation) => [conversation.id, conversation.inquiry_id])
  );

  const proposalCountByInquiryId = new Map<string, number>();
  for (const proposal of proposals) {
    const inquiryId = inquiryByConversationId.get(proposal.conversation_id);
    if (!inquiryId) continue;
    proposalCountByInquiryId.set(inquiryId, (proposalCountByInquiryId.get(inquiryId) ?? 0) + 1);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Painel Administrativo</h1>
        <p className="text-sm text-slate-500">
          Visão geral da plataforma com usuários, cotações abertas e necessidades publicadas.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Users className="w-4 h-4 text-slate-500" />}
          label="Total de usuários"
          value={userCountRes.count ?? 0}
        />
        <StatCard
          icon={<ClipboardList className="w-4 h-4 text-slate-500" />}
          label="Cotações abertas"
          value={openInquiriesCountRes.count ?? 0}
        />
        <StatCard
          icon={<PackageSearch className="w-4 h-4 text-slate-500" />}
          label="Necessidades publicadas"
          value={needsCountRes.count ?? 0}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Usuarios cadastrados</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs font-medium uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Nome</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Perfil</th>
                    <th className="text-left px-4 py-3">Empresa</th>
                    <th className="text-left px-4 py-3">Cadastro</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        Nenhum usuario cadastrado.
                      </td>
                    </tr>
                  )}
                  {profiles.map((profile) => {
                    const buyer = buyerByUserId.get(profile.id);
                    const supplier = supplierByUserId.get(profile.id);
                    const profileName =
                      profile.full_name ?? buyer?.name ?? supplier?.trade_name ?? "Sem nome";
                    const company = supplier?.company_name ?? buyer?.company_name ?? buyer?.company ?? "-";
                    const status = supplier?.suspended ? "Suspenso" : "Ativo";
                    const statusTone = supplier?.suspended
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200";

                    return (
                      <tr key={profile.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-900">{profileName}</td>
                        <td className="px-4 py-3 text-slate-600">{userEmailById.get(profile.id) ?? "-"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize">
                            {profile.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{company}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDate(profile.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusTone}`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Cotações abertas</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs font-medium uppercase tracking-wide">
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">Comprador</th>
                    <th className="text-left px-4 py-3">Necessidade</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Criacao</th>
                    <th className="text-left px-4 py-3">Prazo</th>
                    <th className="text-left px-4 py-3">Propostas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {openInquiries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                        Nenhuma cotacao em aberto.
                      </td>
                    </tr>
                  )}
                  {openInquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-xs">
                        {shortId(inquiry.id)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p className="font-medium text-slate-900">{inquiry.buyer_name ?? "-"}</p>
                        <p className="text-xs text-slate-500">{inquiry.buyer_company ?? "Sem empresa"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{truncate(inquiry.description, 110)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{INQUIRY_STATUS_LABEL[inquiry.status] ?? inquiry.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(inquiry.created_at)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {inquiry.desired_deadline ?? inquiry.deadline ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {proposalCountByInquiryId.get(inquiry.id) ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Necessidades publicadas</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs font-medium uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Nome do produto</th>
                    <th className="text-left px-4 py-3">Descricao</th>
                    <th className="text-left px-4 py-3">Comprador</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Criacao</th>
                    <th className="text-left px-4 py-3">Ultima atualizacao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {publishedNeeds.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        Nenhuma necessidade publicada.
                      </td>
                    </tr>
                  )}
                  {publishedNeeds.map((need) => {
                    const buyer = buyerByUserId.get(need.user_id);

                    return (
                      <tr key={need.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{need.query}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{need.description ? truncate(need.description, 110) : "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <p className="font-medium text-slate-900">{buyer?.name ?? "Comprador"}</p>
                          <p className="text-xs text-slate-500">
                            {buyer?.company_name ?? buyer?.company ?? userEmailById.get(need.user_id) ?? "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{NEEDS_STATUS_LABEL[need.status] ?? need.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDate(need.created_at)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDate(need.updated_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          {icon}
        </div>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function shortId(id: string) {
  return id.slice(0, 8);
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}...`;
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
