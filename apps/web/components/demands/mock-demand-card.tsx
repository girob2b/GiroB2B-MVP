import type React from "react";
import {
  CalendarClock,
  Eye,
  MapPin,
  Megaphone,
  Package,
  Wallet,
} from "lucide-react";

export interface MockDemand {
  /** Título da demanda ilustrativa */
  title: string;
  /** Categoria */
  category: string;
  /** Cidade/UF — ex: "São Paulo, SP" */
  location: string;
  /** Recência formatada — ex: "publicada há 2 dias" */
  publishedAgo: string;
  /** Contatos recebidos (social proof do lado vendedor) */
  proposals: number;
  /** Quantidade decisiva — ex: "1.000 caixas" (opcional, com fallback) */
  quantity?: string;
  /** Orçamento decisivo — ex: "até R$ 18.000" (opcional, com fallback) */
  budget?: string;
  /** Prazo desejado — ex: "20 jul. 2026" (opcional, com fallback) */
  deadline?: string;
}

/**
 * Card de demanda ilustrativa (cold-start) — ESPELHA o DemandCard real.
 *
 * Mesma identidade visual "anúncio de procura-se" (acento dourado, megafone,
 * metadados decisivos) para que a vitrine pareça cheia e coerente antes de ter
 * volume real. Inconfundível ao lado do MockCompanyCard (perfil teal/slate).
 *
 * Decisão 2026-06-22: REMOVIDA a etiqueta "exemplo" e o estado desabilitado —
 * os cards de preenchimento usam o MESMO CTA funcional do WhatsApp via slot
 * `action` (PublicContactGate → /seja-vendedor). A única diferença do real é
 * não ser clicável (não há slug) e não destacar "verificado".
 */
export function MockDemandCard({
  demand,
  action,
}: {
  demand: MockDemand;
  action?: React.ReactNode;
}) {
  return (
    <div
      aria-label={`Demanda: ${demand.title}`}
      className="flex h-full flex-col gap-0"
    >
      <div
        className={`relative flex h-full flex-col overflow-hidden rounded-2xl border border-gold-200 bg-white pl-1.5 ${
          action != null ? "rounded-b-none border-b-0" : ""
        }`}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1.5 bg-linear-to-b from-gold-400 to-gold-600"
        />

        <div className="flex h-full flex-col bg-linear-to-b from-gold-50/70 to-white px-4 pb-4 pt-4">
          {/* ── 1. Eyebrow "DEMANDA ABERTA" ───────────────────────────────── */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gold-700">
              <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
              Demanda aberta
            </span>
          </div>

          {/* ── 2. Título da necessidade ──────────────────────────────────── */}
          <h3 className="mt-3 text-base font-bold leading-snug text-slate-900 line-clamp-3">
            {demand.title}
          </h3>

          {/* ── 3. Metadados decisivos + categoria/local ──────────────────── */}
          <dl className="mt-3 flex flex-1 flex-col gap-1.5">
            {demand.quantity && (
              <MetaRow icon={Package} label="Quantidade" value={demand.quantity} />
            )}
            {demand.budget && (
              <MetaRow icon={Wallet} label="Orçamento" value={demand.budget} />
            )}
            {demand.deadline && (
              <MetaRow icon={CalendarClock} label="Prazo" value={demand.deadline} />
            )}
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-semibold text-gold-800">
                {demand.category}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin
                  className="h-3.5 w-3.5 shrink-0 text-gold-500"
                  aria-hidden="true"
                />
                {demand.location}
              </span>
            </p>
          </dl>

          {/* ── 4. Footer: recência + prova social ────────────────────────── */}
          <footer className="mt-auto flex items-center justify-between gap-2 border-t border-gold-100 pt-3 text-[11px] font-medium text-slate-500">
            <span>{demand.publishedAgo}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 font-semibold text-gold-800">
              <Megaphone className="h-3 w-3" aria-hidden="true" />
              {demand.proposals} contataram
            </span>
          </footer>
        </div>
      </div>

      {/* ── 5. Slot de ação ───────────────────────────────────────────────── */}
      {action != null && (
        <div className="rounded-b-2xl border border-t-0 border-gold-200 bg-white pl-1.5">
          <div className="px-4 pb-4 pt-3">{action}</div>
        </div>
      )}
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3.5 w-3.5 shrink-0 text-gold-600" aria-hidden="true" />
      <dt className="sr-only">{label}</dt>
      <dd className="font-semibold text-slate-700">{value}</dd>
    </div>
  );
}

/**
 * 6 demandas ilustrativas cobrindo setores B2B brasileiros.
 * Ordem por proposals decrescente (maior tração primeiro — social proof).
 *
 * Decisão 2026-06-22: reintroduzidos quantity/budget/deadline para que o card
 * de exemplo exiba o mesmo bloco de metadados decisivos do card real (paridade
 * visual na vitrine). Recência em PT-BR feminino ("publicada").
 */
export const MOCK_DEMANDS: MockDemand[] = [
  {
    title: "1.000 caixas de papelão ondulado 30×40",
    category: "Embalagens",
    location: "São Paulo, SP",
    publishedAgo: "publicada há 2 dias",
    proposals: 14,
    quantity: "1.000 caixas",
    budget: "até R$ 8.500",
    deadline: "30 jun. 2026",
  },
  {
    title: "Uniformes (camisa polo) para equipe industrial",
    category: "Têxtil e Confecção",
    location: "Curitiba, PR",
    publishedAgo: "publicada ontem",
    proposals: 11,
    quantity: "200 unidades",
    budget: "até R$ 12.000",
    deadline: "15 jul. 2026",
  },
  {
    title: "Material elétrico — disjuntores e cabos",
    category: "Materiais de Construção",
    location: "Belo Horizonte, MG",
    publishedAgo: "publicada há 3 dias",
    proposals: 9,
    quantity: "lote completo",
    deadline: "10 jul. 2026",
  },
  {
    title: "Insumos para padaria industrial (mensal)",
    category: "Alimentos e Bebidas",
    location: "Porto Alegre, RS",
    publishedAgo: "publicada há 4 dias",
    proposals: 8,
    quantity: "fornecimento mensal",
    budget: "até R$ 25.000",
  },
  {
    title: "Peças de reposição para linha de montagem",
    category: "Autopeças",
    location: "Joinville, SC",
    publishedAgo: "publicada há 5 dias",
    proposals: 7,
    quantity: "50 itens",
    deadline: "05 ago. 2026",
  },
  {
    title: "Material de limpeza profissional (kit completo)",
    category: "Limpeza e Higiene",
    location: "Recife, PE",
    publishedAgo: "publicada hoje",
    proposals: 6,
    quantity: "10 kits",
    budget: "até R$ 4.200",
  },
];
