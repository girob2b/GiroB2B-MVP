import { LayoutDashboard } from "lucide-react";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral da sua atividade na plataforma.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <LayoutDashboard className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 text-base font-semibold text-slate-700">Em breve</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          KPIs consolidados de cotações, leads, pipeline e mensagens — tudo num
          painel só. Aguarde.
        </p>
      </div>
    </div>
  );
}
