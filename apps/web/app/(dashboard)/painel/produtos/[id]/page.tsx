import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProduct } from "@/app/actions/products";
import ProdutoForm from "../_components/produto-form";

export const metadata = { title: "Editar Produto" };

interface CategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
}

interface ProductRow {
  id: string;
  supplier_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  unit: string | null;
  min_order: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  tags: string[] | null;
  images: string[] | null;
  status: string;
  is_resold: boolean;
}

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  const [productRes, categoriesRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, supplier_id, name, description, category_id, unit, min_order, price_min_cents, price_max_cents, tags, images, status, is_resold")
      .eq("id", id)
      .single(),
    supabase.from("categories").select("id, name, parent_id").order("sort_order"),
  ]);

  const product = productRes.data as ProductRow | null;
  if (!product || product.supplier_id !== supplierId!) notFound();

  const categories = (categoriesRes.data as CategoryRow[]) ?? [];

  // Bind productId as first arg to updateProduct
  const action = updateProduct.bind(null, product.id);

  const isDraftImport = product.is_resold && product.status === "draft";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Editar Produto</h1>
        <p className="text-muted-foreground mt-1 text-sm truncate">{product.name}</p>
      </div>

      {isDraftImport && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p className="font-semibold mb-1">Produto importado como rascunho</p>
          <p className="text-amber-800">
            Copiamos a imagem e o nome de outro fornecedor. Preencha categoria, descrição, faixa de preço e prazo antes de publicar.
            Para publicar, troque o status para <strong>Ativo</strong> ao salvar.
          </p>
        </div>
      )}

      <ProdutoForm
        action={action}
        supplierId={supplierId!}
        categories={categories}
        defaultValues={product}
        submitLabel={isDraftImport ? "Salvar rascunho" : "Salvar Alterações"}
      />
    </div>
  );
}
