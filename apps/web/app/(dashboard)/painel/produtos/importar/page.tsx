import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Package, ArrowLeft, Search } from "lucide-react";
import ImportCatalogClient from "./_components/import-catalog-client";

export const metadata = { title: "Importar de outro fornecedor — GiroB2B" };

interface ImportableProductRow {
  id: string;
  name: string;
  slug: string;
  images: string[] | null;
  supplier_id: string;
  suppliers: {
    id: string;
    trade_name: string;
    city: string | null;
    state: string | null;
    allow_relisting: boolean;
  } | null;
}

export default async function ImportarProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login?redirect=/painel/produtos/importar");

  const { data: supplierData } = await supabase
    .from("suppliers")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  const mySupplierId = (supplierData as { id: string } | null)?.id;
  if (!mySupplierId) redirect("/painel");

  // Busca produtos ativos de suppliers que permitem relistagem (exceto o próprio)
  let query = supabase
    .from("products")
    .select(`
      id, name, slug, images, supplier_id,
      suppliers!inner(id, trade_name, city, state, allow_relisting)
    `)
    .eq("status", "active")
    .eq("suppliers.allow_relisting", true)
    .neq("supplier_id", mySupplierId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (q.trim()) {
    query = query.ilike("name", `%${q.trim()}%`);
  }

  const { data: productsData } = await query;
  const products = (productsData as unknown as ImportableProductRow[] | null) ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/painel/produtos"
          className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors"
          aria-label="Voltar para produtos"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Importar de outro fornecedor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione imagem e nome ao seu catálogo como rascunho. Você completa os demais dados depois.
          </p>
        </div>
      </div>

      <form action="/painel/produtos/importar" method="GET" className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome do produto..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)] focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="h-11 px-6 rounded-xl bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] text-white font-semibold text-sm"
        >
          Buscar
        </button>
      </form>

      {products.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <div>
            <p className="font-semibold text-slate-700">
              {q ? "Nenhum produto encontrado" : "Nenhum produto disponível para importação"}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {q
                ? "Tente outra busca ou deixe vazio para ver todos."
                : "Só aparecem aqui produtos de fornecedores que ativaram a opção de relistagem."}
            </p>
          </div>
        </div>
      ) : (
        <ImportCatalogClient
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            image: p.images?.[0] ?? null,
            supplierName: p.suppliers?.trade_name ?? "Fornecedor",
            location: [p.suppliers?.city, p.suppliers?.state].filter(Boolean).join(" / ") || "Brasil",
          }))}
        />
      )}
    </div>
  );
}
