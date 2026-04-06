import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProduct } from "@/app/actions/products";
import ProdutoForm from "../_components/produto-form";

export const metadata = { title: "Novo Produto" };

interface CategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
}

export default async function NovoProdutoPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  const userId = authData.user!.id;

  const { data: supplierData } = await supabase
    .from("suppliers")
    .select("id")
    .eq("user_id", userId)
    .single();

  const supplierId = (supplierData as { id: string } | null)?.id;
  if (!supplierId) redirect("/painel");

  const { data: categoriesData } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .order("sort_order");

  const categories = (categoriesData as CategoryRow[]) ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Novo Produto</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Adicione um produto ao seu catálogo. Cada produto vira uma página indexada no Google.
        </p>
      </div>
      <ProdutoForm
        action={createProduct}
        supplierId={supplierId}
        categories={categories}
        submitLabel="Criar Produto"
      />
    </div>
  );
}
