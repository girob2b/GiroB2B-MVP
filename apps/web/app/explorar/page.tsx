import { Suspense } from "react";
import ExplorerSearch from "@/app/(dashboard)/painel/explorar/_components/explorer-search";

export const metadata = { title: "Explorar Fornecedores e Produtos — GiroB2B" };

export default function ExplorarPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Explorar</h1>
        <p className="text-sm text-muted-foreground">
          Encontre fornecedores e produtos B2B de todo o Brasil.
        </p>
      </div>
      <Suspense>
        <ExplorerSearch />
      </Suspense>
    </div>
  );
}
