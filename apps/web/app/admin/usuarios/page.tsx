import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import SuspendUserButton from "./_components/suspend-user-button";
import { normalizeAccountStatus } from "@/lib/auth/account-status";

export const metadata = { title: "Usuarios - Admin" };
export const dynamic = "force-dynamic";

type UserTab = "todos" | "fornecedores" | "compradores" | "admins" | "ambos";

type AdminAuthUser = {
  id: string;
  email: string | null;
  created_at: string;
};

type UserProfileRow = {
  id: string;
  role: "user" | "buyer" | "supplier" | "admin";
  full_name: string | null;
  created_at: string;
};

type BuyerRow = {
  user_id: string | null;
  name: string | null;
  email: string;
  company_name: string | null;
  company: string | null;
  cnpj: string | null;
  phone: string | null;
  created_at: string;
};

type SupplierRow = {
  user_id: string;
  trade_name: string;
  company_name: string;
  cnpj: string | null;
  phone: string | null;
  suspended: boolean;
  created_at: string;
};

type UserListItem = {
  id: string;
  name: string;
  email: string;
  company: string;
  document: string;
  phone: string;
  createdAt: string;
  status: "ativa" | "suspensa";
  profiles: string;
  isSupplier: boolean;
  isSuspended: boolean;
  isAdmin: boolean;
  hasBuyer: boolean;
};

interface UsersPageProps {
  searchParams: Promise<{ tab?: string }>;
}

const TAB_LABEL: Record<UserTab, string> = {
  todos: "Todos",
  fornecedores: "Fornecedores",
  compradores: "Compradores",
  admins: "Admins",
  ambos: "Ambos",
};

const TAB_ORDER: UserTab[] = ["todos", "fornecedores", "compradores", "admins", "ambos"];

function normalizeTab(tab: string | undefined): UserTab {
  if (tab === "todos" || tab === "fornecedores" || tab === "compradores" || tab === "admins" || tab === "ambos") {
    return tab;
  }
  return "todos";
}

export default async function AdminUsuariosPage({ searchParams }: UsersPageProps) {
  const { tab } = await searchParams;
  const activeTab = normalizeTab(tab);
  const adminClient = createAdminClient();
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const currentAdminId = authData.user?.id ?? "";

  const [authUsersRes, profilesRes, profileStatusRes, buyersRes, suppliersRes] = await Promise.all([
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    adminClient.from("user_profiles").select("id, role, full_name, created_at"),
    adminClient.from("user_profiles").select("id, status"),
    adminClient.from("buyers").select("user_id, name, email, company_name, company, cnpj, phone, created_at"),
    adminClient.from("suppliers").select("user_id, trade_name, company_name, cnpj, phone, suspended, created_at"),
  ]);

  const authUsers = (authUsersRes.data.users ?? []) as AdminAuthUser[];
  const profiles = (profilesRes.data ?? []) as UserProfileRow[];
  const profileStatusRows = (profileStatusRes.error
    ? []
    : (profileStatusRes.data as unknown as Array<{ id: string; status?: string | null }>)) ?? [];
  const buyers = (buyersRes.data ?? []) as BuyerRow[];
  const suppliers = (suppliersRes.data ?? []) as SupplierRow[];
  const profileStatusById = new Map(profileStatusRows.map((profile) => [profile.id, profile.status ?? null]));

  const authById = new Map(authUsers.map((user) => [user.id, user]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const buyerByUserId = new Map(
    buyers
      .filter((buyer): buyer is BuyerRow & { user_id: string } => Boolean(buyer.user_id))
      .map((buyer) => [buyer.user_id, buyer])
  );
  const supplierByUserId = new Map(suppliers.map((supplier) => [supplier.user_id, supplier]));

  const userIds = new Set<string>([
    ...authUsers.map((item) => item.id),
    ...profiles.map((item) => item.id),
    ...buyers.map((item) => item.user_id).filter((value): value is string => Boolean(value)),
    ...suppliers.map((item) => item.user_id),
  ]);

  const allRows: UserListItem[] = [];

  for (const userId of userIds) {
    const profile = profileById.get(userId);
    const buyer = buyerByUserId.get(userId);
    const supplier = supplierByUserId.get(userId);

    const accountStatus = normalizeAccountStatus(profileStatusById.get(userId), Boolean(supplier?.suspended));
    const hasBuyer = Boolean(buyer);
    const hasSupplier = Boolean(supplier);
    const isAdmin = profile?.role === "admin";

    const authUser = authById.get(userId);
    const createdAt = earliestDate([
      supplier?.created_at,
      buyer?.created_at,
      profile?.created_at,
      authUser?.created_at,
    ]);

    let profilesLabel = "Usuario";
    if (hasBuyer && hasSupplier) profilesLabel = "Comprador + Fornecedor";
    else if (hasSupplier) profilesLabel = "Fornecedor";
    else if (hasBuyer) profilesLabel = "Comprador";
    if (isAdmin) profilesLabel = hasBuyer || hasSupplier ? `${profilesLabel} + Admin` : "Admin";

    const item: UserListItem = {
      id: userId,
      name: profile?.full_name ?? buyer?.name ?? supplier?.trade_name ?? "Sem nome",
      email: authUser?.email ?? buyer?.email ?? "-",
      company: supplier?.company_name ?? supplier?.trade_name ?? buyer?.company_name ?? buyer?.company ?? "-",
      document: supplier?.cnpj ?? buyer?.cnpj ?? "-",
      phone: supplier?.phone ?? buyer?.phone ?? "-",
      createdAt,
      status: accountStatus,
      profiles: profilesLabel,
      isSupplier: hasSupplier,
      isSuspended: accountStatus === "suspensa",
      isAdmin,
      hasBuyer,
    };

    allRows.push(item);
  }

  const sortedAll = allRows.sort(sortByDateDesc);

  const rowsByTab: Record<UserTab, UserListItem[]> = {
    todos: sortedAll,
    fornecedores: sortedAll.filter((row) => row.isSupplier),
    compradores: sortedAll.filter((row) => row.hasBuyer),
    admins: sortedAll.filter((row) => row.isAdmin),
    ambos: sortedAll.filter((row) => row.isSupplier && row.hasBuyer),
  };

  const activeRows = rowsByTab[activeTab];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
        <p className="text-sm text-slate-500">
          Gestao unificada de compradores, fornecedores, administradores e demais perfis.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Abas de usuarios">
        {TAB_ORDER.map((tabKey) => {
          const isActive = activeTab === tabKey;
          return (
            <Link
              key={tabKey}
              href={`/admin/usuarios?tab=${tabKey}`}
              className={[
                "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
              ].join(" ")}
            >
              {TAB_LABEL[tabKey]} ({rowsByTab[tabKey].length})
            </Link>
          );
        })}
      </nav>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs font-medium uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Empresa</th>
                  <th className="text-left px-4 py-3">Perfis</th>
                  <th className="text-left px-4 py-3">Documento</th>
                  <th className="text-left px-4 py-3">Telefone</th>
                  <th className="text-left px-4 py-3">Cadastro</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Acao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                      Nenhum usuario encontrado nesta aba.
                    </td>
                  </tr>
                )}

                {activeRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.email}</td>
                    <td className="px-4 py-3 text-slate-600">{row.company}</td>
                    <td className="px-4 py-3 text-slate-600">{row.profiles}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDocument(row.document)}</td>
                    <td className="px-4 py-3 text-slate-600">{row.phone}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                          row.status === "suspensa"
                            ? "border-red-200 bg-red-100 text-red-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700",
                        ].join(" ")}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SuspendUserButton
                        userId={row.id}
                        suspended={row.isSuspended}
                        canManage={row.id !== currentAdminId}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function earliestDate(values: Array<string | undefined | null>) {
  const validDates = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (validDates.length === 0) return new Date(0).toISOString();
  return validDates[0].toISOString();
}

function sortByDateDesc(a: UserListItem, b: UserListItem) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function formatDate(value: string) {
  if (!value || value.startsWith("1970-01-01")) return "-";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDocument(document: string) {
  const digits = document.replace(/\D/g, "");
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return document;
}
