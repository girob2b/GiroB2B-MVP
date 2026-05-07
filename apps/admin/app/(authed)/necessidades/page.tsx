import { createAdminClient } from "@/lib/supabase-admin";
import NecessidadesAdminList, { type AdminDemand } from "./_components/needs-admin-list";

export const metadata = { title: "Necessidades — Admin" };
export const dynamic = "force-dynamic";

interface DemandRow {
  id: string;
  buyer_user_id: string;
  slug: string;
  title: string;
  description: string;
  status: "open" | "negotiating" | "fulfilled" | "cancelled" | "expired";
  category_id: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  views_count: number;
  contact_count: number;
  published_at: string;
  expires_at: string;
}

export default async function AdminNecessidadesPage() {
  const supabase = createAdminClient();

  const { data: demands } = await supabase
    .from("demands")
    .select(
      "id, buyer_user_id, slug, title, description, status, category_id, delivery_city, delivery_state, views_count, contact_count, published_at, expires_at"
    )
    .order("published_at", { ascending: false })
    .limit(200);

  const rows = (demands ?? []) as DemandRow[];
  const userIds = [...new Set(rows.map((d) => d.buyer_user_id))];
  const categoryIds = [
    ...new Set(rows.map((d) => d.category_id).filter((v): v is string => Boolean(v))),
  ];

  const [{ data: buyers }, { data: categories }, { data: authUsers }] = await Promise.all([
    userIds.length
      ? supabase
          .from("buyers")
          .select("user_id, name, company_name, company, email")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] }),
    categoryIds.length
      ? supabase.from("categories").select("id, name").in("id", categoryIds)
      : Promise.resolve({ data: [] }),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const buyerByUserId = new Map(
    ((buyers ?? []) as Array<{
      user_id: string | null;
      name: string | null;
      company_name: string | null;
      company: string | null;
      email: string | null;
    }>)
      .filter((b): b is { user_id: string; name: string | null; company_name: string | null; company: string | null; email: string | null } => typeof b.user_id === "string")
      .map((b) => [b.user_id, b])
  );
  const categoryById = new Map(
    ((categories ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name])
  );
  const authEmailById = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? null])
  );

  const enriched: AdminDemand[] = rows.map((d) => {
    const buyer = buyerByUserId.get(d.buyer_user_id);
    return {
      ...d,
      category_name: d.category_id ? categoryById.get(d.category_id) ?? null : null,
      buyer_name: buyer?.name ?? null,
      buyer_company: buyer?.company_name ?? buyer?.company ?? null,
      buyer_email: buyer?.email ?? authEmailById.get(d.buyer_user_id) ?? null,
    };
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Necessidades</h1>
        <p className="text-sm text-muted-foreground">
          Necessidades publicadas pelos compradores. Acompanhe e modere conforme necessário.
        </p>
      </header>

      <NecessidadesAdminList initialItems={enriched} />
    </div>
  );
}
