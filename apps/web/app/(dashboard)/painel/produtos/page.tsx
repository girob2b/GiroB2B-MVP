import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Plus, Pencil, Repeat } from "lucide-react";
import DeleteProductButton from "./_components/delete-product-button";
import ImportButton from "./_components/import-button";

export const metadata = { title: "Produtos" };

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  images: string[] | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  inquiry_count: number;
  views_count: number;
  created_at: string;
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ProdutosPage() {
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

  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, slug, description, status, images, price_min_cents, price_max_cents, inquiry_count, views_count, created_at")
    .eq("supplier_id", supplierId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  const products = (productsData as ProductRow[]) ?? [];

  const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    active: {
      label: "Ativo",
      className: "bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)] border-[color:var(--brand-green-200)]"
    },
    paused: {
      label: "Pausado",
      className: "bg-slate-50 text-slate-600 border-slate-200"
    },
    draft: {
      label: "Rascunho",
      className: "bg-amber-50 text-amber-700 border-amber-200"
    },
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {products.length} produto{products.length !== 1 ? "s" : ""} cadastrado{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportButton />
          <Button
            variant="outline"
            render={<Link href="/painel/produtos/importar" />}
            className="rounded-xl h-10 px-5 gap-2 border-slate-200 hover:border-amber-400 hover:text-amber-700"
          >
            <Repeat className="w-4 h-4" />
            Importar de outro fornecedor
          </Button>
          <Button
            render={<Link href="/painel/produtos/novo" />}
            className="btn-primary rounded-xl h-10 px-5"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <Card className="border-dashed border-2 bg-slate-50/50">
          <CardContent className="py-20 text-center space-y-6">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto">
              <Package className="w-10 h-10 text-[color:var(--brand-green-600)]" />
            </div>
            <div className="max-w-xs mx-auto">
              <p className="font-bold text-xl text-slate-900">Nenhum produto ainda</p>
              <p className="text-sm text-muted-foreground mt-2">
                Cada produto vira uma página indexada no Google — comece agora a divulgar seu catálogo!
              </p>
            </div>
            <Button 
              render={<Link href="/painel/produtos/novo" />}
              className="btn-primary rounded-xl h-11 px-8"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar primeiro produto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => {
            const statusInfo = STATUS_LABELS[product.status] ?? { label: product.status, className: "border-slate-200 text-slate-600" };
            return (
              <Card key={product.id} className="hover:shadow-md transition-all duration-200 border-slate-200 overflow-hidden group">
                <CardContent className="p-0">
                  <div className="flex items-stretch gap-0">
                    {/* Thumbnail */}
                    <div className="w-24 bg-slate-50 border-r border-slate-100 shrink-0 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                      {product.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-slate-300" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-5 min-w-0 flex flex-col justify-center">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 text-lg group-hover:text-[color:var(--brand-green-700)] transition-colors truncate">
                              {product.name}
                            </p>
                          </div>
                          {product.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {product.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold ${statusInfo.className}`}>
                          {statusInfo.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-6 mt-4">
                        {product.price_min_cents && (
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Preço</span>
                            <span className="text-sm font-semibold text-slate-700">
                              {formatPrice(product.price_min_cents)}
                              {product.price_max_cents && product.price_max_cents !== product.price_min_cents
                                ? ` — ${formatPrice(product.price_max_cents)}`
                                : ""}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col border-l border-slate-100 pl-6">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Visualizações</span>
                          <span className="text-sm font-semibold text-slate-700">{product.views_count}</span>
                        </div>
                        <div className="flex flex-col border-l border-slate-100 pl-6">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Cotações</span>
                          <span className="text-sm font-semibold text-slate-700">{product.inquiry_count}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col border-l border-slate-100 divide-y divide-slate-100">
                      <Link 
                        href={`/painel/produtos/${product.id}`}
                        className="flex-1 flex items-center justify-center px-6 hover:bg-slate-50 transition-colors group/edit"
                        title="Editar produto"
                      >
                        <Pencil className="w-4 h-4 text-slate-400 group-hover/edit:text-[color:var(--brand-green-600)]" />
                      </Link>
                      <DeleteProductButton productId={product.id} productName={product.name} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
