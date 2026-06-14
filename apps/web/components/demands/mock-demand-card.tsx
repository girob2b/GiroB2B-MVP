import { CalendarClock, MapPin, Package, Sparkles } from "lucide-react";

export interface MockDemand {
  title: string;
  category: string;
  quantity: string;
  location: string;
  deadline: string;
  budget: string;
  publishedAgo: string;
}

/**
 * Card "exemplo" pra preencher a vitrine da home enquanto não há volume real.
 *
 * Decisão Vitor 2026-05-25: aceitar mocks visuais (coerente com stats mockados)
 * pra manter "cara de marketplace" mesmo com banco vazio. Badge "Exemplo"
 * deixa explícito que não é uma necessidade real.
 *
 * Quando volume real chegar (>=6 demands), `app/page.tsx` para de injetar
 * mocks automaticamente — sem mudança de código.
 */
export function MockDemandCard({ demand }: { demand: MockDemand }) {
  return (
    <div
      aria-label="Card de exemplo"
      className="group flex flex-col rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5 transition-all"
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">
            <Sparkles className="h-3 w-3" /> Exemplo
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {demand.category}
          </span>
        </div>
        <h3 className="text-base font-bold leading-snug text-slate-700 line-clamp-2">
          {demand.title}
        </h3>
        <p className="text-xs italic text-slate-400">
          Sua necessidade aparece aqui pros vendedores em poucos segundos.
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
        <Row icon={<Package className="h-3.5 w-3.5" />} label="Quantidade" value={demand.quantity} />
        <Row icon={<CalendarClock className="h-3.5 w-3.5" />} label="Prazo" value={demand.deadline} />
        <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Local" value={demand.location} />
        <Row icon={<span className="font-bold">R$</span>} label="Orçamento" value={demand.budget} />
      </dl>

      <footer className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] text-slate-400">
        <span>{demand.publishedAgo}</span>
        <span className="italic">ilustrativo</span>
      </footer>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate font-medium text-slate-600">{value}</p>
      </div>
    </div>
  );
}

/**
 * 6 cards ilustrativos cobrindo categorias diferentes — usado como fallback
 * pra preencher a vitrine. Ordem deliberada (Embalagens primeiro = ML/IndiaMART
 * são clicáveis e dão pista de variedade do marketplace).
 */
export const MOCK_DEMANDS: MockDemand[] = [
  {
    title: "1.000 caixas de papelão ondulado 30×40",
    category: "Embalagens",
    quantity: "1.000 unid",
    location: "São Paulo, SP",
    deadline: "até 15 dias",
    budget: "até R$ 5.000",
    publishedAgo: "publicado há 2 dias",
  },
  {
    title: "Uniformes (camisa polo) para equipe industrial",
    category: "Têxtil e Confecção",
    quantity: "120 unid",
    location: "Curitiba, PR",
    deadline: "até 30 dias",
    budget: "até R$ 8.500",
    publishedAgo: "publicado ontem",
  },
  {
    title: "Material elétrico — disjuntores e cabos",
    category: "Materiais de Construção",
    quantity: "1 lote",
    location: "Belo Horizonte, MG",
    deadline: "até 10 dias",
    budget: "até R$ 12.000",
    publishedAgo: "publicado há 3 dias",
  },
  {
    title: "Insumos para padaria industrial (mensal)",
    category: "Alimentos e Bebidas",
    quantity: "500 kg",
    location: "Porto Alegre, RS",
    deadline: "recorrente",
    budget: "até R$ 6.000/mês",
    publishedAgo: "publicado há 4 dias",
  },
  {
    title: "Peças de reposição para fábrica de autopeças",
    category: "Autopeças",
    quantity: "1 lote",
    location: "Joinville, SC",
    deadline: "até 20 dias",
    budget: "até R$ 18.000",
    publishedAgo: "publicado há 5 dias",
  },
  {
    title: "Material de limpeza profissional (kit completo)",
    category: "Limpeza e Higiene",
    quantity: "1 kit",
    location: "Recife, PE",
    deadline: "até 7 dias",
    budget: "até R$ 3.500",
    publishedAgo: "publicado hoje",
  },
];
