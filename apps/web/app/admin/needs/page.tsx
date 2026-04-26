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

      <NeedsAdminList initialNeeds={(needs ?? []) as AdminSearchNeed[]} />
    </div>
  );
}
