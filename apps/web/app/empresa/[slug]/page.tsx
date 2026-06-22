import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Calendar, MapPin, ShieldCheck } from "lucide-react";
import { getPublicBuyerCompany } from "@/lib/services/buyers";
import { resolveSectorNames } from "@/components/buyers/public-companies-section";
import { createAdminClient } from "@/lib/supabase/admin";
import { DemandCard } from "@/components/demands/demand-card";
import { PublicContactGate } from "@/components/demands/public-contact-gate";
import { JsonLd } from "@/components/seo/json-ld";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_URL } from "@/lib/email";

export const dynamic = "force-dynamic";

interface RouteParams {
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getPublicBuyerCompany(slug);
  if (!detail) return { title: "Empresa não encontrada" };

  const { company } = detail;
  const locationLabel = [company.city, company.state]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join(" / ");
  const description = locationLabel
    ? `${company.company_name} — empresa compradora no GiroB2B (${locationLabel}). Veja as demandas abertas.`
    : `${company.company_name} — empresa compradora no GiroB2B. Veja as demandas abertas.`;

  return {
    title: `${company.company_name} — Empresa no GiroB2B`,
    description,
    alternates: { canonical: `/empresa/${slug}` },
    openGraph: {
      title: company.company_name,
      description,
      type: "profile",
      url: `/empresa/${slug}`,
    },
  };
}

function formatMemberSinceYear(memberSince: string): string | null {
  const date = new Date(memberSince);
  if (Number.isNaN(date.getTime())) return null;
  return String(date.getFullYear());
}

export default async function EmpresaPublicaPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const detail = await getPublicBuyerCompany(slug);

  // null = slug inexistente ou empresa não elegível (não opted-in / sem
  // identidade real). A view buyers_public já filtra a elegibilidade.
  if (!detail) notFound();

  const { company, demands } = detail;

  // Setores de interesse → nomes amigáveis (batch, sem N+1).
  const sectorNameBySlug = await resolveSectorNames([company]);
  const sectorNames = company.sector_slugs
    .map((s) => sectorNameBySlug.get(s) ?? null)
    .filter((n): n is string => n != null);

  // Nomes de categoria das demandas, para o badge do DemandCard.
  const categoryIds = Array.from(
    new Set(
      demands
        .map((d) => d.category_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );
  const categoryNameById = new Map<string, string>();
  if (categoryIds.length > 0) {
    const admin = createAdminClient();
    const { data: cats } = await admin
      .from("categories")
      .select("id, name")
      .in("id", categoryIds);
    for (const c of (cats as Array<{ id: string; name: string }> | null) ?? []) {
      categoryNameById.set(c.id, c.name);
    }
  }

  const locationLabel =
    [company.city, company.state]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .join(" / ") || "Brasil";
  const memberSinceYear = formatMemberSinceYear(company.member_since);

  // ── Schema.org Organization + BreadcrumbList — SEM telephone/address (sem PII) ──
  const baseUrl = APP_URL;
  const orgSchema: Record<string, unknown> = {
    "@type": "Organization",
    name: company.company_name,
    url: `${baseUrl}/empresa/${company.slug}`,
    areaServed: "BR",
    ...(company.city || company.state
      ? {
          address: {
            "@type": "PostalAddress",
            addressCountry: "BR",
            ...(company.state ? { addressRegion: company.state } : {}),
            ...(company.city ? { addressLocality: company.city } : {}),
          },
        }
      : {}),
  };
  const breadcrumbSchema: Record<string, unknown> = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Empresas", item: `${baseUrl}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: company.company_name,
        item: `${baseUrl}/empresa/${company.slug}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <JsonLd schema={[orgSchema, breadcrumbSchema]} />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        {/* Voltar */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </Link>

        {/* ── Header: identidade + cidade/UF + selo + membro desde ─────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--brand-primary-50),transparent_60%)]" />
          <div className="relative flex flex-col gap-6 p-8 md:flex-row md:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-brand-50 text-brand-700 shadow-sm"
                aria-hidden="true"
              >
                <Building2 className="h-9 w-9" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold text-slate-900 md:text-3xl">
                  {company.company_name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-xl border-slate-200 text-slate-700">
                    <MapPin className="h-3 w-3" /> {locationLabel}
                  </Badge>
                  {company.is_company_verified && (
                    <Badge className="rounded-xl bg-[color:var(--brand-primary-600)] text-white">
                      <ShieldCheck className="h-3 w-3" /> Verificada
                    </Badge>
                  )}
                  {memberSinceYear && (
                    <Badge variant="secondary" className="rounded-xl">
                      <Calendar className="h-3 w-3" /> membro desde {memberSinceYear}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 px-5 py-3 text-center md:ml-auto">
              <div className="text-2xl font-bold text-brand-700">
                {company.open_demands_count}
              </div>
              <div className="text-xs font-medium text-slate-500">
                {company.open_demands_count === 1 ? "demanda aberta" : "demandas abertas"}
              </div>
            </div>
          </div>
        </div>

        {/* ── Setores de interesse ─────────────────────────────────────────── */}
        {sectorNames.length > 0 && (
          <Card className="overflow-hidden rounded-3xl border-slate-200">
            <CardHeader className="border-b border-slate-100 bg-slate-50/30">
              <CardTitle className="text-lg font-bold">Setores de interesse</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                {sectorNames.map((name) => (
                  <Badge
                    key={name}
                    variant="outline"
                    className="rounded-xl border-[color:var(--brand-primary-200)] bg-[color:var(--brand-primary-50)] text-[color:var(--brand-primary-700)]"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Demandas abertas (o "catálogo" da empresa compradora) ────────── */}
        <Card className="overflow-hidden rounded-3xl border-slate-200">
          <CardHeader className="border-b border-slate-100 bg-slate-50/30">
            <CardTitle className="text-lg font-bold">Demandas abertas</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {demands.length === 0 ? (
              <p className="text-slate-500">
                Esta empresa não tem demandas abertas no momento.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {demands.map((d) => (
                  <DemandCard
                    key={d.id}
                    demand={d}
                    categoryName={
                      d.category_id ? (categoryNameById.get(d.category_id) ?? null) : null
                    }
                    action={<PublicContactGate />}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
