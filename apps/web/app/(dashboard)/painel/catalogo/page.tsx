import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CatalogoUploader, { type CatalogFile } from "./_components/catalogo-uploader";

export const metadata = { title: "Catálogo — GiroB2B" };

export default async function CatalogoPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!supplier) redirect("/painel");

  const [catalogRes, productsRes] = await Promise.all([
    supabase
      .from("supplier_catalogs")
      .select("id, title, file_url, file_name, file_size, file_type, created_at")
      .eq("supplier_id", supplier.id)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id)
      .eq("status", "active"),
  ]);

  const files  = (catalogRes.data  ?? []) as CatalogFile[];
  const hasProducts = (productsRes.count ?? 0) > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Meu Catálogo</h1>
        <p className="text-sm text-muted-foreground">
          Suba PDFs ou imagens do seu portfólio. Compradores poderão visualizar e baixar
          direto do seu perfil público — sem precisar cadastrar produto por produto.
        </p>
      </div>

      <CatalogoUploader
        supplierId={supplier.id}
        files={files}
        hasProducts={hasProducts}
      />
    </div>
  );
}
