import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  Eye,
  FileCheck2,
  FileText,
  ListChecks,
  MapPin,
  MessageCircle,
  Package,
  Shield,
  Truck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bumpViews, getDemandBySlug, listPublicDemands } from "@/lib/services/demands";
import { APP_URL } from "@/lib/email";
import ContactButton from "@/app/(dashboard)/painel/leads/_components/contact-button";
import { DemandCard } from "@/components/demands/demand-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const demand = await getDemandBySlug(slug);
  if (!demand) return { title: "Demanda não encontrada" };
  const metaDescription = demand.description?.slice(0, 160) ?? demand.title;
  return {
    title: demand.title,
    description: metaDescription,
    alternates: { canonical: `/demanda/${slug}` },
    openGraph: {
      title: demand.title,
      description: metaDescription,
      type: "article",
      url: `/demanda/${slug}`,
    },
  };
}

export default async function NecessidadeDetailPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const demand = await getDemandBySlug(slug);
  if (!demand) notFound();

  // Bump views fire-and-forget — não bloqueia render
  void bumpViews(demand.id);

  const admin = createAdminClient();

  // Tenta resolver o user logado (silencioso — página é pública)
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  let viewerSupplier: {
    id: string;
    canContact: boolean;
  } | null = null;

  if (authData.user) {
    const { data: supplier } = await admin
      .from("suppliers")
      .select("id, subscription_status, subscription_expires_at")
      .eq("user_id", authData.user.id)
      .maybeSingle<{
        id: string;
        subscription_status: "inactive" | "trialing" | "active" | "expired";
        subscription_expires_at: string | null;
      }>();
    if (supplier) {
      const isActive =
        (supplier.subscription_status === "active" || supplier.subscription_status === "trialing") &&
        (!supplier.subscription_expires_at || new Date(supplier.subscription_expires_at) > new Date());
      viewerSupplier = { id: supplier.id, canContact: isActive };
    }
  }

  // Fetch de categoria e demandas relacionadas em paralelo (#19)
  const [categoryResult, relatedResult] = await Promise.all([
    demand.category_id
      ? admin
          .from("categories")
          .select("name, slug")
          .eq("id", demand.category_id)
          .maybeSingle<{ name: string; slug: string }>()
      : Promise.resolve({ data: null }),
    demand.category_id
      ? listPublicDemands({
          category_id: demand.category_id,
          exclude_id: demand.id,
          sort: "recent",
          limit: 3,
        }).catch(() => ({ rows: [], total: 0 }))
      : Promise.resolve({ rows: [], total: 0 }),
  ]);

  const category = categoryResult.data;
  const relatedDemands = relatedResult.rows;

  // attachment_url armazena só o object_path (SecRev C1 — 2026-05-14).
  const attachmentPublicUrl =
    demand.kind === "structured" && demand.attachment_url
      ? admin.storage.from("demand-attachments").getPublicUrl(demand.attachment_url).data.publicUrl
      : null;

  const location = [demand.delivery_city, demand.delivery_state].filter(Boolean).join(", ") || null;
  const deadline = demand.deadline ? formatDate(demand.deadline) : null;
  const budget = demand.budget_max_cents ? formatBRL(demand.budget_max_cents) : null;
  const quantity =
    demand.quantity != null
      ? `${demand.quantity.toLocaleString("pt-BR")}${demand.unit ? ` ${demand.unit}` : ""}`
      : null;

  // Badge de urgência — lado vendedor (rec #13 urgencia-prova-social-lado-vendedor)
  const isNew = isNewDemand(demand.published_at);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BuyAction",
    name: demand.title,
    description: demand.description ?? undefined,
    object: { "@type": "Product", name: demand.title, category: category?.name },
    location: location
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: demand.delivery_city,
            addressRegion: demand.delivery_state,
          },
        }
      : undefined,
    url: `${APP_URL}/demanda/${slug}`,
    datePublished: demand.published_at,
  };

  return (
    <article className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navegação de retorno */}
      <Link
        href="/buscar"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar às demandas
      </Link>

      {/* Cabeçalho da demanda */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {category && (
            <Badge
              variant="secondary"
              render={
                <Link href={`/categoria/${category.slug}`} className="hover:opacity-80" />
              }
            >
              {category.name}
            </Badge>
          )}
          {demand.kind === "structured" && (
            <Badge variant="outline" className="gap-1 border-brand-300 text-brand-700">
              <FileCheck2 className="h-3 w-3" aria-hidden="true" />
              Proposta estruturada
            </Badge>
          )}
          {/* Badge de recência — visível pra todos; urgência do lado do vendedor */}
          {isNew && (
            <Badge className="gap-1 bg-brand-600 text-white">
              Nova
            </Badge>
          )}
          {/* Trust badge comprador */}
          {demand.buyer_is_verified && (
            <Badge variant="outline" className="gap-1 border-brand-300 text-brand-700">
              <Shield className="h-3 w-3" aria-hidden="true" />
              Comprador verificado
            </Badge>
          )}
        </div>

        <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900">
          {demand.title}
        </h1>

        {/* Metadados de atividade — urgência pro vendedor */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>{formatRelative(demand.published_at)}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1" title="Visualizações">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {demand.views_count}
          </span>
          <span aria-hidden="true">·</span>
          {/* contact_count como badge de peso — urgência do vendedor (#13) */}
          {demand.contact_count > 0 ? (
            <span className="inline-flex items-center gap-1 font-semibold text-brand-700" title="Vendedores que já contataram">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {demand.contact_count} vendedor{demand.contact_count === 1 ? "" : "es"} já contatou
            </span>
          ) : (
            <span className="inline-flex items-center gap-1" title="Nenhum contato ainda">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Nenhum contato ainda
            </span>
          )}
        </div>
      </header>

      {/* Layout principal — coluna larga + aside sticky */}
      {/* Breakpoint md (768px) — aside sobe junto com o conteúdo em tablets */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_300px]">
        {/* Coluna principal */}
        <div className="space-y-4">
          {/* Descrição */}
          {demand.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Descrição
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {demand.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Itens do pedido (kind=structured) */}
          {demand.kind === "structured" && demand.items && demand.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <ListChecks className="h-4 w-4" aria-hidden="true" />
                  Itens do pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="pb-2 pr-3 w-10">#</th>
                        <th className="pb-2 pr-3">Descrição</th>
                        <th className="pb-2 pr-3">Qtd</th>
                        <th className="pb-2">Especificações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demand.items.map((it, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0 align-top">
                          <td className="py-3 pr-3 text-xs font-semibold text-slate-400">{i + 1}</td>
                          <td className="py-3 pr-3 font-medium text-slate-800">{it.description}</td>
                          <td className="py-3 pr-3 whitespace-nowrap text-slate-700">
                            {it.quantity.toLocaleString("pt-BR")} {it.unit}
                          </td>
                          <td className="py-3 text-slate-600 whitespace-pre-line">
                            {it.specs || <span className="text-slate-400">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Condições (structured) */}
          {demand.kind === "structured" &&
            (demand.payment_terms || demand.delivery_terms || demand.required_docs) && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {demand.payment_terms && (
                  <ConditionCard
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Pagamento"
                    value={demand.payment_terms}
                  />
                )}
                {demand.delivery_terms && (
                  <ConditionCard
                    icon={<Truck className="h-4 w-4" />}
                    label="Entrega"
                    value={demand.delivery_terms}
                  />
                )}
                {demand.required_docs && (
                  <ConditionCard
                    icon={<FileCheck2 className="h-4 w-4" />}
                    label="Documentos exigidos"
                    value={demand.required_docs}
                  />
                )}
              </div>
            )}

          {/* Pedido formal PDF */}
          {attachmentPublicUrl && (
            <Card className="border-brand-200 bg-brand-50">
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Pedido formal (PDF)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={attachmentPublicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Baixar PDF
                </a>
              </CardContent>
            </Card>
          )}

          {/* Detalhes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Detalhes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {demand.kind === "simple" && (
                  <Detail icon={<Package className="h-4 w-4" />} label="Quantidade">
                    {quantity ?? "—"}
                  </Detail>
                )}
                <Detail icon={<CalendarClock className="h-4 w-4" />} label="Prazo desejado">
                  {deadline ?? "Sem prazo informado"}
                </Detail>
                <Detail icon={<MapPin className="h-4 w-4" />} label="Local de entrega">
                  {location ?? "—"}
                </Detail>
                <Detail
                  icon={<span className="font-bold text-slate-400 text-sm">R$</span>}
                  label="Orçamento máximo"
                >
                  {budget ? `até ${budget}` : "Sem orçamento informado"}
                </Detail>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral — CTA WhatsApp (sticky) */}
        <aside className="space-y-4">
          <div className="sticky top-6 space-y-4">
            {/* Card CTA principal */}
            <Card className="border-brand-200 bg-brand-50">
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Sou vendedor
                </p>
                <CardTitle className="text-lg font-bold text-slate-900">
                  Atende essa demanda?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Assinantes contatam o comprador pelo WhatsApp. Agora você pode incluir
                  preço, prazo e uma mensagem curta na proposta.
                </p>

                <ContactButton
                  demandId={demand.id}
                  canContact={viewerSupplier?.canContact ?? false}
                  hasSupplier={!!viewerSupplier}
                />

                {!viewerSupplier?.canContact && (
                  <p className="text-xs text-slate-500">
                    Disponível para vendedores com assinatura ativa.
                  </p>
                )}

                {!viewerSupplier && (
                  <Link
                    href="/seja-vendedor"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-300 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
                  >
                    Ver planos de vendedor
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Validade da demanda */}
            <Card size="sm">
              <CardContent>
                <p className="text-xs text-slate-500">
                  <strong className="text-slate-700">Publicação válida</strong> até{" "}
                  {formatDate(demand.expires_at)}. Após essa data, a demanda some do feed
                  automaticamente.
                </p>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      {/* ── #19 Demandas relacionadas ────────────────────────────────────────────
          Só renderiza quando há relacionadas (estado vazio = bloco ausente).
          Grid sm:2 / lg:3. Categoria da demanda atual como eixo.
      ──────────────────────────────────────────────────────────────────────── */}
      {relatedDemands.length > 0 && category && (
        <section className="space-y-4 pt-2" aria-label="Demandas relacionadas">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              Outras demandas em{" "}
              <Link
                href={`/categoria/${category.slug}`}
                className="text-brand-600 hover:underline"
              >
                {category.name}
              </Link>
            </h2>
            <Link
              href={`/categoria/${category.slug}`}
              className="shrink-0 text-sm font-semibold text-brand-600 hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          <ul
            role="list"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {relatedDemands.map((d) => (
              <li key={d.id}>
                <DemandCard demand={d} categoryName={category.name} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-slate-400" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium text-slate-800">{children}</dd>
      </div>
    </div>
  );
}

function ConditionCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span className="text-slate-400" aria-hidden="true">{icon}</span>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-line text-sm text-slate-700">{value}</p>
      </CardContent>
    </Card>
  );
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatRelative(value: string) {
  const ms = Date.now() - new Date(value).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Publicado hoje";
  if (days === 1) return "Publicado ontem";
  if (days < 7) return `Publicado há ${days} dias`;
  if (days < 30)
    return `Publicado há ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? "s" : ""}`;
  return `Publicado em ${formatDate(value)}`;
}

/** Demanda publicada nas últimas 48h = "Nova" (badge de urgência pro vendedor). */
function isNewDemand(publishedAt: string): boolean {
  const ms = Date.now() - new Date(publishedAt).getTime();
  return ms < 48 * 60 * 60 * 1000;
}
