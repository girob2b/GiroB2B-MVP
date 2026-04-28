import { createClient } from "@/lib/supabase/server";
import ExplorerSearch from "./_components/explorer-search";
import CatalogSuppliersSection, { type CatalogSupplierRow } from "./_components/catalog-suppliers-section";
import { CompleteCadastroCard } from "./_components/complete-cadastro-card";

export const metadata = { title: "Explorar — GiroB2B" };

export default async function ExplorarPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  // Pesquisa na web é exclusiva do admin (interface separada — não plugada aqui).
  let cadastroCompleto = true;
  if (user) {
    const [buyerRes, supplierRes] = await Promise.all([
      supabase
        .from("buyers")
        .select("name, phone, cnpj, company_name, city, state, address")
        .eq("user_id", user.id)
        .maybeSingle<{
          name: string | null; phone: string | null; cnpj: string | null;
          company_name: string | null; city: string | null; state: string | null;
          address: string | null;
        }>(),
      supabase
        .from("suppliers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle<{ id: string }>(),
    ]);

    // Cadastro completo: supplier sempre, buyer-only se todos os campos B2B preenchidos.
    const buyer = buyerRes.data;
    const buyerProfileComplete = !!(
      buyer?.name && buyer.phone && buyer.cnpj &&
      buyer.company_name && buyer.city && buyer.state && buyer.address
    );
    cadastroCompleto = !!supplierRes.data || buyerProfileComplete;
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
      {!cadastroCompleto && <CompleteCadastroCard />}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Explorar</h1>
        <p className="text-sm text-muted-foreground">Encontre fornecedores e produtos B2B de todo o Brasil.</p>
      </div>
      <ExplorerSearch />
      <CatalogSuppliersSection suppliers={catalogSuppliers} />
    </div>
  );
}
