import { createClient } from "@/lib/supabase/server";
import NeedsAdminList, { type AdminSearchNeed } from "./_components/needs-admin-list";

export const metadata = { title: "Necessidades de busca — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminNeedsPage() {
  const supabase = await createClient();

  const { data: needs } = await supabase
    .from("search_needs")
    .select(
      "id, user_id, query, description, filters, status, admin_notes, created_at, updated_at, resolved_at, resolved_by_supplier_id"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const userIds = [...new Set((needs ?? []).map((need) => need.user_id).filter(Boolean))];
  const { data: buyers } = userIds.length
    ? await supabase
        .from("buyers")
        .select("user_id, name, company_name, company, email")
        .in("user_id", userIds)
    : { data: [] };

  const buyerByUserId = new Map(
    (buyers ?? [])
      .filter((buyer): buyer is { user_id: string; name: string | null; company_name: string | null; company: string | null; email: string | null } =>
        typeof buyer.user_id === "string"
      )
      .map((buyer) => [buyer.user_id, buyer])
  );

  const enrichedNeeds = (needs ?? []).map((need) => {
    const buyer = buyerByUserId.get(need.user_id);
    return {
      ...need,
      buyer_name: buyer?.name ?? null,
      buyer_company: buyer?.company_name ?? buyer?.company ?? null,
      buyer_email: buyer?.email ?? null,
    };
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Necessidades de busca
        </h1>
        <p className="text-sm text-muted-foreground">
          Lista de pedidos dos compradores que não encontraram o fornecedor na base.
          Cadastre o fornecedor e marque como resolvido.
        </p>
      </header>

      <NeedsAdminList initialNeeds={enrichedNeeds as AdminSearchNeed[]} />
    </div>
  );
}
