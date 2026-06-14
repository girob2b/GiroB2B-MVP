import {
  Boxes,
  Building2,
  CalendarClock,
  Factory,
  Hammer,
  MapPin,
  MessageCircle,
  Package,
  ShoppingBasket,
  Shirt,
  Sparkles,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

export interface MockDemand {
  /** Setor/segmento da empresa anonimizada (Decisão Vitor 2026-06-14:
   *  evitar nome fictício pra não enganar nem usar marca real sem autorização). */
  companySector: string;
  /** Cidade/UF da empresa */
  companyLocation: string;
  /** Tamanho da empresa (faixa de colaboradores) */
  companySize: string;
  /** Ícone do setor (lucide-react component) */
  icon: keyof typeof ICON_MAP;
  /** Demanda publicada */
  title: string;
  category: string;
  quantity: string;
  deadline: string;
  budget: string;
  publishedAgo: string;
  /** Quantas propostas a empresa já recebeu (social proof — métrica que importa) */
  proposals: number;
}

const ICON_MAP = {
  factory: Factory,
  package: Package,
  shirt: Shirt,
  hammer: Hammer,
  basket: ShoppingBasket,
  truck: Truck,
  wrench: Wrench,
  boxes: Boxes,
  building: Building2,
} as const;

/**
 * Card "empresa anonimizada" pra preencher a vitrine da home.
 *
 * Decisão Vitor 2026-06-14: substitui mocks abstratos por perfil de empresa
 * realista (setor + cidade + tamanho + tração) — mais convincente que badge
 * "Exemplo". Reflete o real: empresas B2B raramente revelam nome ao publicar
 * cotação.
 *
 * Diferença visual vs DemandCard real:
 * - Header com avatar/icone do setor + linha de identificação da empresa
 * - Footer com métrica "X propostas recebidas" (substitui views/contatos)
 * - Bordas sutis cinza-claro (não-dashed) — parece real, não placeholder
 * - Tem o disclaimer "exemplo ilustrativo" no rodapé pra não enganar
 */
export function MockDemandCard({ demand }: { demand: MockDemand }) {
  const Icon = ICON_MAP[demand.icon] ?? Building2;
  return (
    <div
      aria-label={`Demanda exemplo de ${demand.companySector}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300"
    >
      {/* Header — perfil anonimizado da empresa */}
      <header className="flex items-start gap-3 pb-3 mb-3 border-b border-slate-100">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 truncate">
            {demand.companySector}
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
            <Users className="h-3 w-3" />
            <span className="truncate">
              {demand.companyLocation} · {demand.companySize}
            </span>
          </p>
        </div>
      </header>

      {/* Demanda */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {demand.category}
          </span>
        </div>
        <h3 className="text-base font-bold leading-snug text-slate-800 line-clamp-2">
          {demand.title}
        </h3>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
        <Row icon={<Package className="h-3.5 w-3.5" />} label="Quantidade" value={demand.quantity} />
        <Row icon={<CalendarClock className="h-3.5 w-3.5" />} label="Prazo" value={demand.deadline} />
        <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Local" value={demand.companyLocation} />
        <Row icon={<span className="font-bold">R$</span>} label="Orçamento" value={demand.budget} />
      </dl>

      {/* Footer — social proof (proposals) + disclaimer discreto */}
      <footer className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
        <span className="text-slate-500">{demand.publishedAgo}</span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-[color:var(--brand-green-700)]">
          <MessageCircle className="h-3 w-3" />
          {demand.proposals} propostas recebidas
        </span>
      </footer>
      <p className="mt-2 text-[10px] italic text-slate-400 flex items-center gap-1">
        <Sparkles className="h-2.5 w-2.5" /> exemplo ilustrativo · empresa anonimizada
      </p>
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
 * 6 demandas ilustrativas cobrindo setores diferentes do B2B brasileiro.
 * Ordem deliberada: maior tração (proposals) primeiro pra puxar olhar e
 * comunicar "a plataforma converte".
 */
export const MOCK_DEMANDS: MockDemand[] = [
  {
    companySector: "Distribuidora de embalagens",
    companyLocation: "São Paulo, SP",
    companySize: "50–200 colab.",
    icon: "package",
    title: "1.000 caixas de papelão ondulado 30×40",
    category: "Embalagens",
    quantity: "1.000 unid",
    deadline: "até 15 dias",
    budget: "até R$ 5.000",
    publishedAgo: "publicado há 2 dias",
    proposals: 14,
  },
  {
    companySector: "Indústria têxtil",
    companyLocation: "Curitiba, PR",
    companySize: "100–500 colab.",
    icon: "shirt",
    title: "Uniformes (camisa polo) para equipe industrial",
    category: "Têxtil e Confecção",
    quantity: "120 unid",
    deadline: "até 30 dias",
    budget: "até R$ 8.500",
    publishedAgo: "publicado ontem",
    proposals: 11,
  },
  {
    companySector: "Construtora de médio porte",
    companyLocation: "Belo Horizonte, MG",
    companySize: "10–50 colab.",
    icon: "hammer",
    title: "Material elétrico — disjuntores e cabos",
    category: "Materiais de Construção",
    quantity: "1 lote",
    deadline: "até 10 dias",
    budget: "até R$ 12.000",
    publishedAgo: "publicado há 3 dias",
    proposals: 9,
  },
  {
    companySector: "Padaria industrial",
    companyLocation: "Porto Alegre, RS",
    companySize: "10–50 colab.",
    icon: "basket",
    title: "Insumos para padaria industrial (mensal)",
    category: "Alimentos e Bebidas",
    quantity: "500 kg",
    deadline: "recorrente",
    budget: "até R$ 6.000/mês",
    publishedAgo: "publicado há 4 dias",
    proposals: 8,
  },
  {
    companySector: "Fábrica de autopeças",
    companyLocation: "Joinville, SC",
    companySize: "200–500 colab.",
    icon: "wrench",
    title: "Peças de reposição para linha de montagem",
    category: "Autopeças",
    quantity: "1 lote",
    deadline: "até 20 dias",
    budget: "até R$ 18.000",
    publishedAgo: "publicado há 5 dias",
    proposals: 7,
  },
  {
    companySector: "Rede de hospitais",
    companyLocation: "Recife, PE",
    companySize: "500+ colab.",
    icon: "building",
    title: "Material de limpeza profissional (kit completo)",
    category: "Limpeza e Higiene",
    quantity: "1 kit",
    deadline: "até 7 dias",
    budget: "até R$ 3.500",
    publishedAgo: "publicado hoje",
    proposals: 6,
  },
];
