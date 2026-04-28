import { BarChart3 } from "lucide-react";

export const metadata = { title: "Relatórios" };

export default function RelatoriosPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Performance de visualizações, cotações e leads.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 text-base font-semibold text-slate-700">Em breve</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          Estamos preparando relatórios mensais com visualizações, taxa de resposta,
          comparação entre períodos e ranking de produtos. Aguarde.
        </p>
      </div>
    </div>
  );
}
