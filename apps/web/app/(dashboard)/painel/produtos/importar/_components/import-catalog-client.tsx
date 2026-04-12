"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Loader2, Plus, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiClient } from "@/lib/api-client";

interface ImportableProduct {
  id: string;
  name: string;
  image: string | null;
  supplierName: string;
  location: string;
}

interface ImportCatalogClientProps {
  products: ImportableProduct[];
}

export default function ImportCatalogClient({ products }: ImportCatalogClientProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(productId: string) {
    setError(null);
    setLoadingId(productId);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/cadastro?redirect=/painel/produtos/importar");
        return;
      }

      const client = apiClient(session.access_token);
      const result = await client.post<{ id: string }>("/products/import", {
        original_product_id: productId,
      });

      router.push(`/painel/produtos/${result.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao importar produto.";
      setError(message);
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => {
          const isLoading = loadingId === p.id;
          return (
            <div
              key={p.id}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative h-40 bg-slate-50 border-b border-slate-100">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="w-10 h-10 text-slate-300" />
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="font-semibold text-slate-900 line-clamp-2 min-h-[2.5em]">
                  {p.name}
                </div>
                <div className="text-xs text-slate-500">
                  <div className="truncate">{p.supplierName}</div>
                  <div>{p.location}</div>
                </div>
                <button
                  onClick={() => handleImport(p.id)}
                  disabled={isLoading || loadingId !== null}
                  className="w-full h-9 rounded-xl bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar ao meu catálogo
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
