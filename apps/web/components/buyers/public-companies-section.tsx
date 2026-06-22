import Link from "next/link";
import { Building2, MapPin, ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  listPublicBuyerCompanies,
  type PublicBuyerCompany,
} from "@/lib/services/buyers";
import { MockCompanyCard, MOCK_COMPANIES } from "@/components/buyers/mock-company-card";
import { Carousel } from "@/components/ui/carousel";

/** Total de slots da vitrine — empresas reais primeiro, mocks completam. */
const COMPANIES_SLOTS = 8;

/**
 * Seção da home: vitrine de empresas COMPRADORAS públicas (opt-in).
 *
 * Renderiza ABAIXO do feed de demandas. SEMPRE aparece (decisão 2026-06-22):
 * empresas reais opted-in vêm primeiro e os slots restantes são preenchidos
 * com MockCompanyCard (cold-start, rotulado "exemplo") até COMPANIES_SLOTS.
 * Mesmo padrão do feed de demandas (DemandCard + MockDemandCard). Enquanto o
 * banco está zerado / ninguém optou, a seção mostra só os exemplos — em vez
 * de sumir e deixar a home sem essa prova de marketplace.
 *
 * Mostra SÓ campos não-PII (razão social, setor, cidade/UF, selo verificada,
 * contagem de demandas) — nunca contato do comprador (LGPD). O "contato" é
 * sempre via a demanda, com o gate público, dentro de /empresa/[slug].
 */
export async function PublicCompaniesSection() {
  let companies: PublicBuyerCompany[] = [];
  try {
    companies = await listPublicBuyerCompanies(COMPANIES_SLOTS);
  } catch {
    // Fail-soft: se a query falhar (ex.: migration 050 ainda não aplicada),
    // a home não quebra — mostramos só os cards de exemplo.
    companies = [];
  }

  // Resolve nomes de setor só quando há empresas reais (sem N+1 / sem query vazia).
  const sectorNameBySlug =
    companies.length > 0 ? await resolveSectorNames(companies) : new Map<string, string>();

  // Mocks preenchem os slots que sobraram (cold-start), espelhando o feed.
  const mockCount = Math.max(0, COMPANIES_SLOTS - companies.length);

  return (
    <section aria-labelledby="empresas-heading" className="mt-14">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="empresas-heading"
            className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
          >
            Empresas que publicam demandas aqui
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Compradores B2B abrindo o perfil. Veja o que cada empresa precisa comprar.
          </p>
        </div>
      </div>

      {/* Carrossel de 1 linha (estilo Mercado Livre) — mesma UX do feed de
          demandas, mas com accent brand/teal (identidade da empresa) para
          manter as duas seções visualmente distintas. */}
      <Carousel ariaLabel="Empresas compradoras públicas" itemNoun="Empresa" accent="brand">
        {companies.map((company) => (
          <PublicCompanyCard
            key={company.slug}
            company={company}
            sectorNames={company.sector_slugs
              .map((s) => sectorNameBySlug.get(s) ?? null)
              .filter((n): n is string => n != null)}
          />
        ))}
        {MOCK_COMPANIES.slice(0, mockCount).map((mock, i) => (
          <MockCompanyCard key={`mock-company-${i}`} company={mock} />
        ))}
      </Carousel>
    </section>
  );
}

/**
 * Card de empresa compradora pública. Só não-PII. Link → /empresa/[slug].
 */
export function PublicCompanyCard({
  company,
  sectorNames,
}: {
  company: PublicBuyerCompany;
  sectorNames: string[];
}) {
  const location = company.state
    ? [company.city, company.state].filter(Boolean).join(", ")
    : null;
  const memberSinceYear = formatMemberSinceYear(company.member_since);
  const demandsLabel =
    company.open_demands_count === 1
      ? "1 demanda aberta"
      : `${company.open_demands_count} demandas abertas`;

  return (
    <Link
      href={`/empresa/${company.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 border-t-2 border-t-brand-400 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_4px_16px_-4px_rgb(10_92_92/0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      {/* Identidade: avatar (inicial) + razão social */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"
          aria-hidden="true"
        >
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-snug text-slate-900 line-clamp-2 group-hover:text-brand-700">
            {company.company_name}
          </h3>
          {company.is_company_verified && (
            <span
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white"
              title="Empresa verificada — CNPJ e razão social confirmados"
            >
              <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Verificada
            </span>
          )}
        </div>
      </div>

      {/* Setores de interesse */}
      {sectorNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sectorNames.slice(0, 3).map((name) => (
            <span
              key={name}
              className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {/* Localização */}
      {location && (
        <p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden="true" />
          {location}
        </p>
      )}

      {/* Footer: demandas abertas + membro desde */}
      <footer className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
          {demandsLabel}
        </span>
        {memberSinceYear && <span>membro desde {memberSinceYear}</span>}
      </footer>
    </Link>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Resolve os category-slugs de interesse (buyers.segments) para nomes amigáveis.
 * Uma única query batch sobre categories — sem N+1.
 */
export async function resolveSectorNames(
  companies: PublicBuyerCompany[]
): Promise<Map<string, string>> {
  const slugs = Array.from(
    new Set(companies.flatMap((c) => c.sector_slugs))
  ).filter((s) => s.length > 0);

  if (slugs.length === 0) return new Map();

  const admin = createAdminClient();
  const { data } = await admin
    .from("categories")
    .select("slug, name")
    .in("slug", slugs);

  return new Map(
    ((data as Array<{ slug: string; name: string }> | null) ?? []).map((c) => [
      c.slug,
      c.name,
    ])
  );
}

function formatMemberSinceYear(memberSince: string): string | null {
  const date = new Date(memberSince);
  if (Number.isNaN(date.getTime())) return null;
  return String(date.getFullYear());
}
