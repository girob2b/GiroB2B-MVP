import ExplorerSearch from "./_components/explorer-search";

export const metadata = { title: "Explorar — GiroB2B" };

export default function ExplorarPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Explorar</h1>
        <p className="text-sm text-slate-500">Encontre fornecedores e produtos B2B de todo o Brasil.</p>
      </div>
      <ExplorerSearch />
    </div>
  );
}
