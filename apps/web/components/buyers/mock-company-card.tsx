import { Building2, MapPin, ShieldCheck } from "lucide-react";

export interface MockCompany {
  /** Razão social fictícia (zero PII real). */
  companyName: string;
  /** Setores de interesse — exibidos como pílulas (máx 3 no card). */
  sectors: string[];
  /** Cidade/UF — ex: "São Paulo, SP". */
  location: string;
  /** Selo "Verificada" quando fizer sentido (paridade com o card real). */
  verified: boolean;
  /** Demandas abertas (social proof). */
  openDemands: number;
  /** Ano de adesão — vira "membro desde {ano}". */
  memberSince: number;
}

/**
 * Card de empresa COMPRADORA ilustrativa — espelha PublicCompanyCard.
 *
 * Cold-start da vitrine "Empresas comprando no GiroB2B": enquanto o banco
 * está zerado / ninguém optou pelo perfil público, a seção é preenchida com
 * estes exemplos plausíveis. Mesmo padrão do MockDemandCard.
 *
 * Diferença do real (PublicCompanyCard):
 * - Não é clicável (sem link para /empresa/[slug] — empresa fictícia).
 * - Borda topo neutra (slate) em vez do destaque brand do card real.
 * - Badge "exemplo" discreto no footer (igual ao mock de demanda).
 *
 * Zero PII real: razão social inventada, sem CNPJ, sem contato.
 */
export function MockCompanyCard({ company }: { company: MockCompany }) {
  const demandsLabel =
    company.openDemands === 1
      ? "1 demanda aberta"
      : `${company.openDemands} demandas abertas`;

  return (
    <div
      aria-label={`Empresa exemplo: ${company.companyName}`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 border-t-2 border-t-slate-300 bg-white p-5"
    >
      {/* Identidade: avatar (ícone) + razão social */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
          aria-hidden="true"
        >
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-snug text-slate-800 line-clamp-2">
            {company.companyName}
          </h3>
          {company.verified && (
            <span
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
              title="Selo ilustrativo de empresa verificada"
            >
              <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Verificada
            </span>
          )}
        </div>
      </div>

      {/* Setores de interesse */}
      {company.sectors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {company.sectors.slice(0, 3).map((name) => (
            <span
              key={name}
              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {/* Localização */}
      <p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        {company.location}
      </p>

      {/* Footer: demandas abertas + membro desde + selo "exemplo" */}
      <footer className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
          {demandsLabel}
        </span>
        <span className="flex items-center gap-2">
          <span className="hidden sm:inline">membro desde {company.memberSince}</span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            exemplo
          </span>
        </span>
      </footer>
    </div>
  );
}

/**
 * 6 empresas compradoras ilustrativas cobrindo setores B2B brasileiros
 * variados. Ordem por openDemands decrescente (maior tração primeiro —
 * social proof), espelhando MOCK_DEMANDS.
 *
 * Razões sociais 100% fictícias — nenhuma empresa real, nenhum CNPJ.
 */
export const MOCK_COMPANIES: MockCompany[] = [
  {
    companyName: "Embalar Distribuidora Ltda.",
    sectors: ["Embalagens", "Logística"],
    location: "São Paulo, SP",
    verified: true,
    openDemands: 5,
    memberSince: 2025,
  },
  {
    companyName: "Sabor & Cia Indústria de Alimentos",
    sectors: ["Alimentos e Bebidas"],
    location: "Curitiba, PR",
    verified: true,
    openDemands: 4,
    memberSince: 2024,
  },
  {
    companyName: "Construfort Materiais de Construção",
    sectors: ["Materiais de Construção"],
    location: "Belo Horizonte, MG",
    verified: false,
    openDemands: 3,
    memberSince: 2025,
  },
  {
    companyName: "TêxtilSul Confecções",
    sectors: ["Têxtil e Confecção"],
    location: "Porto Alegre, RS",
    verified: false,
    openDemands: 3,
    memberSince: 2026,
  },
  {
    companyName: "MecânicaPrime Autopeças",
    sectors: ["Autopeças"],
    location: "Joinville, SC",
    verified: true,
    openDemands: 2,
    memberSince: 2024,
  },
  {
    companyName: "LimpaMax Produtos de Higiene",
    sectors: ["Limpeza e Higiene"],
    location: "Recife, PE",
    verified: false,
    openDemands: 2,
    memberSince: 2025,
  },
];
