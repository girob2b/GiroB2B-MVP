import { createClient } from "@/lib/supabase/server";
import { canUseWebSearch } from "@/lib/web-search-access";
import ExplorerSearch from "./_components/explorer-search";
import CatalogSuppliersSection, { type CatalogSupplierRow } from "./_components/catalog-suppliers-section";

export const metadata = { title: "Explorar — GiroB2B" };

export default async function ExplorarPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  let webSearchAllowed = false;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("can_use_web_search")
      .eq("id", user.id)
      .maybeSingle();
    webSearchAllowed = canUseWebSearch(user, profile ?? null);
  }

  // Suppliers with at least one catalog file (two-query approach, simple for MVP)
  let catalogSuppliers: CatalogSupplierRow[] = [];
  const { data: catalogRows } = await supabase
    .from("supplier_catalogs")
    .select("supplier_id")
    .order("created_at", { ascending: false })
    .limit(60);

  const uniqueIds = [...new Set((catalogRows ?? []).map((r) => r.supplier_id))].slice(0, 6);
  if (uniqueIds.length) {
    const { data } = await supabase
      .from("suppliers")
      .select("id, trade_name, slug, logo_url, city, state, supplier_type")
      .in("id", uniqueIds)
      .eq("suspended", false);
    catalogSuppliers = (data ?? []) as CatalogSupplierRow[];
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Explorar</h1>
        <p className="text-sm text-muted-foreground">Encontre fornecedores e produtos B2B de todo o Brasil.</p>
      </div>
      <ExplorerSearch canUseWebSearch={webSearchAllowed} />
      <CatalogSuppliersSection suppliers={catalogSuppliers} />
    </div>
  );
}
