"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Globe, Loader2, MapPin, Package, X, MessageSquare,
  Building2, ExternalLink, Mail, Phone, MessageCircle, BadgeCheck,
  BookOpen, Store,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Types (mirror do scraper) ─────────────────────────────────────────────

interface Address {
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  cep?: string;
}

interface CompanyContact {
  email?: string;
  phone?: string;
  whatsapp?: string;
  emails?: string[];
  phones?: string[];
  catalog_url?: string;
  marketplace_urls?: string[];
}

interface CompanyProduct {
  name: string;
  description?: string;
  category_hint?: string;
}

export interface DiscoveredCompany {
  id: string;
  domain: string;
  cnpj: string | null;
  legal_name: string | null;
  trade_name: string | null;
  description: string | null;
  address: Address | null;
  segment_cnae: string | null;
  segment_slug: string | null;
  products: CompanyProduct[];
  contact: CompanyContact;
  website: string | null;
  logo_url: string | null;
  source_quality: "high" | "medium" | "low";
}

type StreamState = "starting" | "streaming" | "done" | "error";

// ─── Props ─────────────────────────────────────────────────────────────────

interface WebSearchPanelProps {
  query: string;
  filters: { state?: string; segment_slug?: string };
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Panel principal
// ═══════════════════════════════════════════════════════════════════════════

export default function WebSearchPanel({ query, filters, onClose }: WebSearchPanelProps) {
  const [companies, setCompanies] = useState<Map<string, Partial<DiscoveredCompany>>>(new Map());
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<StreamState>("starting");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DiscoveredCompany | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (query.trim().length < 2) {
      setState("starting");
      setError(null);
      setCompanies(new Map());
      setProgress(0);
      return;
    }
    let cancelled = false;
    let finished = false;
    let source: EventSource | null = null;

    setState("starting");
    setError(null);
    setProgress(0);
    setCompanies(new Map());

    (async () => {
      try {
        const res = await fetch("/api/search/web", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, filters }),
        });
        if (cancelled) return;
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          console.error("[web-search-panel] POST /api/search/web falhou", res.status, payload);
          throw new Error(payload.error ?? `Erro ${res.status}`);
        }
        const payload = await res.json();

        if (payload.cached && Array.isArray(payload.companies)) {
          const map = new Map<string, Partial<DiscoveredCompany>>();
          for (const c of payload.companies as DiscoveredCompany[]) map.set(c.id, c);
          setCompanies(map);
          setProgress(100);
          setState("done");
          return;
        }

        const jobId = payload.jobId as string | undefined;
        if (!jobId) throw new Error("jobId ausente na resposta");

        source = new EventSource(`/api/search/web/${jobId}/stream`);
        setState("streaming");

        source.addEventListener("discovered", (e) => {
          const data = JSON.parse((e as MessageEvent).data);
          setCompanies((prev) => {
            const next = new Map(prev);
            for (const c of data.companies as Array<{ domain: string; title: string; snippet: string; url: string }>) {
              if (!next.has(c.domain)) {
                next.set(c.domain, {
                  domain: c.domain,
                  trade_name: c.title,
                  description: c.snippet,
                  website: c.url,
                });
              }
            }
            return next;
          });
        });

        source.addEventListener("partial", (e) => {
          const data = JSON.parse((e as MessageEvent).data);
          setCompanies((prev) => {
            const next = new Map(prev);
            const existing = next.get(data.companyId) ?? {};
            next.set(data.companyId, { ...existing, ...data.partial });
            return next;
          });
        });

        source.addEventListener("enriched", (e) => {
          const data = JSON.parse((e as MessageEvent).data);
          const full = data.full as DiscoveredCompany;
          setCompanies((prev) => {
            const next = new Map(prev);
            if (full.domain && next.has(full.domain) && full.domain !== data.companyId) {
              next.delete(full.domain);
            }
            next.set(data.companyId, full);
            return next;
          });
        });

        source.addEventListener("progress", (e) => {
          const data = JSON.parse((e as MessageEvent).data);
          if (typeof data.progress === "number") setProgress(data.progress);
        });

        source.addEventListener("done", () => {
          finished = true;
          setProgress(100);
          setState("done");
          source?.close();
        });

        // Erros *emitidos pelo servidor* chegam como MessageEvent com data JSON.
        // O navegador também dispara um evento nativo `error` (Event comum, sem data)
        // quando o servidor fecha a conexão — normal após `done`.
        source.addEventListener("error", (ev) => {
          const hasServerData = (ev as MessageEvent).data !== undefined;
          if (hasServerData) {
            const raw = (ev as MessageEvent).data;
            const msg = safeParse(raw)?.message ?? "Erro no streaming";
            console.error("[web-search-panel] SSE error evento do servidor:", raw);
            finished = true;
            setError(msg);
            setState("error");
            source?.close();
            return;
          }
          if (finished || source?.readyState === EventSource.CLOSED) return;
          console.error("[web-search-panel] SSE conexão interrompida, readyState:", source?.readyState);
          finished = true;
          setError("conexão com o servidor interrompida");
          setState("error");
          source?.close();
        });
      } catch (err) {
        if (!cancelled) {
          console.error("[web-search-panel] exception:", err);
          setError(err instanceof Error ? err.message : "Erro desconhecido");
          setState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [query, filters.state, filters.segment_slug, retryTick]);

  const list = Array.from(companies.values())
    .filter((c) => c.domain)
    .map((c) => ({ c, tier: tierFor(c) }))
    .sort((a, b) => tierOrder(a.tier) - tierOrder(b.tier));

  return (
    <section className="space-y-3 my-6">
      <header className="flex items-center justify-between gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50">
        <div className="flex items-center gap-2 text-blue-700 min-w-0">
          <Globe className="w-4 h-4 shrink-0" />
          <span className="text-sm font-semibold whitespace-nowrap">Pesquisa na web</span>
          <span className="text-xs text-blue-600 truncate">&ldquo;{query}&rdquo;</span>
          {state === "starting" && (
            <span className="flex items-center gap-1 text-xs text-blue-600 shrink-0">
              <Loader2 className="w-3 h-3 animate-spin" /> iniciando…
            </span>
          )}
          {state === "streaming" && (
            <span className="flex items-center gap-1 text-xs text-blue-600 shrink-0">
              <Loader2 className="w-3 h-3 animate-spin" /> {progress}%
            </span>
          )}
          {state === "done" && (
            <span className="text-xs text-blue-600 shrink-0">
              {list.length} empresa{list.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-blue-400 hover:text-blue-700 shrink-0" aria-label="Fechar">
          <X className="w-4 h-4" />
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm flex items-center justify-between gap-3 flex-wrap">
          <span className="min-w-0">Não foi possível concluir a busca externa: {error}</span>
          <button
            onClick={() => setRetryTick((t) => t + 1)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {state === "streaming" && list.length === 0 && (
        <div className="rounded-xl border border-dashed border-blue-200 bg-white p-6 text-center space-y-2">
          <Loader2 className="w-6 h-6 text-blue-400 mx-auto animate-spin" />
          <p className="text-sm text-slate-600">Descobrindo empresas na web…</p>
        </div>
      )}

      {list.length > 0 && (
        <div className="flex gap-4 items-start">
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {list.map(({ c, tier }, i) => (
              <WebCompanyCard
                key={c.id ?? c.domain ?? i}
                company={c}
                tier={tier}
                onClick={() => c.id && setSelected(c as DiscoveredCompany)}
              />
            ))}
          </div>
          <aside className="hidden xl:block w-64 shrink-0 sticky top-4">
            <QualityLegend counts={countByTier(list)} />
          </aside>
        </div>
      )}

      {state === "done" && list.length === 0 && !error && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-600">Nenhuma empresa encontrada na web para essa busca.</p>
        </div>
      )}

      {selected && (
        <WebCompanyOverlay company={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function safeParse(raw: string): { message?: string } | null {
  try { return JSON.parse(raw); } catch { return null; }
}

function displayName(c: Partial<DiscoveredCompany>): string {
  return c.trade_name || c.legal_name || c.domain || "Empresa";
}

// ─── Card ──────────────────────────────────────────────────────────────────

// ─── Scoring de riqueza de informação ──────────────────────────────────────

type Tier = "green" | "yellow" | "red";

function scoreCompany(c: Partial<DiscoveredCompany>): number {
  let s = 0;
  const emails = c.contact?.emails ?? (c.contact?.email ? [c.contact.email] : []);
  const phones = c.contact?.phones ?? (c.contact?.phone ? [c.contact.phone] : []);
  s += Math.min(emails.length, 3) * 2;
  s += Math.min(phones.length, 3) * 2;
  if (c.contact?.whatsapp) s += 3;
  if (c.website) s += 2;
  if (c.address?.city) s += 2;
  if (c.address?.street) s += 3;
  if (c.cnpj) s += 3;
  if (c.logo_url) s += 1;
  if (c.description && c.description.length > 40) s += 2;
  if (Array.isArray(c.products) && c.products.length > 0) s += Math.min(c.products.length, 3);
  if (c.contact?.catalog_url) s += 3;
  if (Array.isArray(c.contact?.marketplace_urls)) s += Math.min(c.contact.marketplace_urls.length, 3) * 2;
  return s;
}

function tierFor(c: Partial<DiscoveredCompany>): Tier {
  const s = scoreCompany(c);
  if (s >= 12) return "green";
  if (s >= 6) return "yellow";
  return "red";
}

function tierOrder(t: Tier): number {
  return t === "green" ? 0 : t === "yellow" ? 1 : 2;
}

function countByTier(list: Array<{ tier: Tier }>): Record<Tier, number> {
  return list.reduce(
    (acc, { tier }) => ({ ...acc, [tier]: acc[tier] + 1 }),
    { green: 0, yellow: 0, red: 0 } as Record<Tier, number>,
  );
}

// ─── Card compacto ─────────────────────────────────────────────────────────

const TIER_STYLES: Record<Tier, { dot: string; ring: string; label: string }> = {
  green:  { dot: "bg-emerald-500", ring: "ring-emerald-100", label: "Perfil completo" },
  yellow: { dot: "bg-amber-500",   ring: "ring-amber-100",   label: "Perfil parcial" },
  red:    { dot: "bg-red-500",     ring: "ring-red-100",     label: "Informações limitadas" },
};

function WebCompanyCard({
  company, tier, onClick,
}: { company: Partial<DiscoveredCompany>; tier: Tier; onClick: () => void }) {
  const name = displayName(company);
  const isEnriched = !!company.id;

  const emails = company.contact?.emails ?? (company.contact?.email ? [company.contact.email] : []);
  const phones = company.contact?.phones ?? (company.contact?.phone ? [company.contact.phone] : []);
  const cityUf = company.address?.city
    ? `${company.address.city}${company.address.state ? `/${company.address.state}` : ""}`
    : null;

  const primaryContact =
    emails[0] ??
    phones[0] ??
    (company.contact?.whatsapp ? "WhatsApp" : null);

  const style = TIER_STYLES[tier];

  return (
    <button
      onClick={onClick}
      disabled={!isEnriched}
      title={style.label}
      className={`relative text-left rounded-xl border bg-white shadow-sm hover:shadow-md transition-all p-3 space-y-2 ${
        isEnriched
          ? "border-slate-200 hover:border-blue-300 cursor-pointer"
          : "border-slate-100 animate-pulse cursor-wait"
      }`}
    >
      <span
        aria-label={style.label}
        className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full ${style.dot} ring-4 ${style.ring}`}
      />

      <div className="flex items-start gap-2 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 overflow-hidden">
          {company.logo_url ? (
            <Image
              src={company.logo_url}
              alt={name}
              width={36}
              height={36}
              className="w-9 h-9 object-cover"
              unoptimized
            />
          ) : (
            <Building2 className="w-4 h-4 text-blue-400" />
          )}
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate">{name}</h3>
          <p className="text-[11px] text-slate-400 truncate">{company.domain}</p>
        </div>
      </div>

      <div className="space-y-1 text-[11px] text-slate-600">
        {primaryContact && (
          <div className="flex items-center gap-1.5 min-w-0">
            {emails[0] ? <Mail className="w-3 h-3 text-slate-400 shrink-0" />
              : phones[0] ? <Phone className="w-3 h-3 text-slate-400 shrink-0" />
              : <MessageCircle className="w-3 h-3 text-emerald-500 shrink-0" />}
            <span className="truncate">{primaryContact}</span>
          </div>
        )}
        {cityUf && (
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{cityUf}</span>
          </div>
        )}
      </div>

      {(company.contact?.catalog_url || (company.contact?.marketplace_urls?.length ?? 0) > 0) && (
        <div className="flex items-center gap-1 flex-wrap">
          {company.contact?.catalog_url && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
              <BookOpen className="w-2.5 h-2.5" /> Catálogo
            </span>
          )}
          {(company.contact?.marketplace_urls?.length ?? 0) > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              <Store className="w-2.5 h-2.5" /> {company.contact!.marketplace_urls!.length} marketplace{company.contact!.marketplace_urls!.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {!isEnriched && (
        <p className="text-[10px] text-slate-400 italic">Enriquecendo…</p>
      )}
    </button>
  );
}

// ─── Legenda lateral ───────────────────────────────────────────────────────

function QualityLegend({ counts }: { counts: Record<Tier, number> }) {
  const items: Array<{ tier: Tier; title: string; description: string }> = [
    {
      tier: "green",
      title: "Perfil completo",
      description: "Contatos, endereço, catálogo ou marketplace — alta confiabilidade.",
    },
    {
      tier: "yellow",
      title: "Perfil parcial",
      description: "Algumas informações disponíveis; pode precisar de pesquisa adicional.",
    },
    {
      tier: "red",
      title: "Informações limitadas",
      description: "Dados mínimos. Use \"Solicitar contato\" para intermediar.",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-900">Entenda as etiquetas</h4>
        <p className="text-[11px] text-slate-500 mt-1">
          Classificamos cada empresa pela riqueza de informação coletada na web.
          Ordem dos cards: mais completos primeiro.
        </p>
      </div>
      <ul className="space-y-3">
        {items.map(({ tier, title, description }) => (
          <li key={tier} className="flex items-start gap-2">
            <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${TIER_STYLES[tier].dot} ring-4 ${TIER_STYLES[tier].ring}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-slate-900">{title}</p>
                <span className="text-[10px] font-bold text-slate-400">{counts[tier]}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Overlay modal ─────────────────────────────────────────────────────────

function WebCompanyOverlay({
  company, onClose,
}: { company: DiscoveredCompany; onClose: () => void }) {
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const name = displayName(company);
  const hasProducts = Array.isArray(company.products) && company.products.length > 0;

  async function handleContact() {
    setContactLoading(true);
    setContactError(null);
    try {
      const defaultMsg = `Tenho interesse em conhecer produtos e condições comerciais de ${name}.`;
      const res = await fetch(`/api/search/web/company/${company.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "invite",
          message: message.trim() || defaultMsg,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error ?? `Erro ${res.status}`);
      }
      setContactSent(true);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : "Erro ao enviar contato");
    } finally {
      setContactLoading(false);
    }
  }

  const locationLabel =
    [company.address?.city, company.address?.state]
      .filter((v) => typeof v === "string" && v.trim().length > 0)
      .join(" / ") || "Brasil";
  const fullAddress = company.address?.street
    ? [
        company.address.street,
        company.address.number,
        company.address.complement,
        company.address.district,
      ].filter(Boolean).join(", ")
    : null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative min-h-screen bg-slate-50 py-10 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-6xl mx-auto space-y-6">
          <button
            onClick={onClose}
            className="sticky top-4 z-20 ml-auto flex items-center gap-2 bg-white/95 backdrop-blur rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-white shadow"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" /> Fechar
          </button>

          {/* Hero — espelho de fornecedor/[slug] */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--brand-green-50),transparent_60%)]" />
            <div className="relative p-8 flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-20 h-20 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center overflow-hidden">
                  {company.logo_url ? (
                    <Image
                      src={company.logo_url}
                      alt={name}
                      width={80}
                      height={80}
                      className="w-20 h-20 object-contain"
                      unoptimized
                    />
                  ) : (
                    <Building2 className="w-10 h-10 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 truncate">{name}</h1>
                  {company.legal_name && company.trade_name && company.legal_name !== company.trade_name && (
                    <p className="text-sm text-slate-500 truncate">{company.legal_name}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-xl border-slate-200 text-slate-700">
                      <MapPin className="w-3 h-3" /> {locationLabel}
                    </Badge>
                    <Badge className="rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-100">
                      <Globe className="w-3 h-3" /> Pesquisa na web
                    </Badge>
                    {company.source_quality === "high" && (
                      <Badge className="rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        <BadgeCheck className="w-3 h-3" /> CNPJ validado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:ml-auto">
                {company.contact.whatsapp && (
                  <Button
                    render={
                      <Link
                        href={`https://wa.me/${company.contact.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                      />
                    }
                    className="btn-primary rounded-xl h-11 px-6"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Falar no WhatsApp
                  </Button>
                )}
                {company.website && (
                  <Button
                    render={<Link href={company.website} target="_blank" />}
                    className="btn-secondary rounded-xl h-11 px-6"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Site
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Sobre */}
          <Card className="border-slate-200 rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/30">
              <CardTitle className="text-lg font-bold">Sobre</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {company.description ? (
                <p className="text-slate-700 leading-relaxed">{company.description}</p>
              ) : (
                <p className="text-slate-500">Informações descritivas não disponíveis publicamente.</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {company.cnpj && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">CNPJ</div>
                    <div className="mt-1 text-slate-900 font-bold">{formatCnpj(company.cnpj)}</div>
                  </div>
                )}
                {company.address?.cep && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">CEP</div>
                    <div className="mt-1 text-slate-900 font-bold">{company.address.cep}</div>
                  </div>
                )}
                {company.segment_slug && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Segmento</div>
                    <div className="mt-1 text-slate-900 font-bold capitalize">
                      {company.segment_slug.replace(/-/g, " ")}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Produtos em destaque */}
          <Card className="border-slate-200 rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/30">
              <CardTitle className="text-lg font-bold">Produtos em destaque</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {hasProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {company.products.map((prod, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="relative h-40 bg-slate-50 flex items-center justify-center">
                        <Package className="w-10 h-10 text-slate-300" />
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="font-bold text-slate-900 line-clamp-1">{prod.name}</div>
                        {prod.description && (
                          <div className="text-sm text-slate-500 line-clamp-2">{prod.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-8 text-center space-y-3">
                  <Package className="w-10 h-10 text-blue-400 mx-auto" />
                  <div>
                    <p className="font-bold text-slate-900">Produtos não listados publicamente</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Esta empresa ainda não publicou catálogo no site. Solicite contato para descobrir
                      portfólio e condições comerciais.
                    </p>
                  </div>
                  {!contactSent && (
                    <a
                      href="#contato-intermediado"
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold h-11 px-6 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Solicitar contato
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contato */}
          <Card className="border-slate-200 rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/30">
              <CardTitle className="text-lg font-bold">Contato</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {company.contact.email && (
                  <a
                    href={`mailto:${company.contact.email}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700 truncate">{company.contact.email}</span>
                  </a>
                )}
                {company.contact.phone && (
                  <a
                    href={`tel:${company.contact.phone}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700 truncate">{company.contact.phone}</span>
                  </a>
                )}
                {company.contact.whatsapp && (
                  <a
                    href={`https://wa.me/${company.contact.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-slate-700 truncate">{company.contact.whatsapp}</span>
                  </a>
                )}
                {company.website && (
                  <Link
                    href={company.website}
                    target="_blank"
                    className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <Globe className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700 truncate">{company.domain}</span>
                  </Link>
                )}
              </div>
              {fullAddress && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700">{fullAddress}</span>
                </div>
              )}
              {!company.contact.email && !company.contact.phone && !company.contact.whatsapp && !fullAddress && (
                <p className="text-slate-500 text-sm">
                  Nenhum canal público encontrado. Use o formulário abaixo para solicitar contato intermediado.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contato intermediado */}
          <Card id="contato-intermediado" className="border-slate-200 rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/30">
              <CardTitle className="text-lg font-bold">Entrar em contato pela GiroB2B</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-slate-600">
                Envie uma solicitação — registramos o interesse e intermediamos a abertura do diálogo
                com {name}.
              </p>

              {contactSent ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 text-sm">
                  Solicitação registrada. Em breve nossa equipe entrará em contato para intermediar o
                  primeiro diálogo.
                </div>
              ) : (
                <>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Qual produto ou serviço você precisa de ${name}?`}
                    className="w-full min-h-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {contactError && <p className="text-xs text-red-600">{contactError}</p>}
                  <Button
                    onClick={handleContact}
                    disabled={contactLoading}
                    className="btn-primary rounded-xl h-11 px-6 w-full sm:w-auto"
                  >
                    {contactLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4 mr-2" />
                    )}
                    Enviar solicitação de contato
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
