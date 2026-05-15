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
  Truck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bumpViews, getDemandBySlug } from "@/lib/services/demands";
import { APP_URL } from "@/lib/email";
import ContactButton from "@/app/(dashboard)/painel/leads/_components/contact-button";

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
  if (!demand) return { title: "Necessidade não encontrada" };
  return {
    title: demand.title,
    description: demand.description.slice(0, 160),
    alternates: { canonical: `/necessidade/${slug}` },
    openGraph: {
      title: demand.title,
      description: demand.description.slice(0, 160),
      type: "article",
      url: `/necessidade/${slug}`,
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

  const { data: category } = demand.category_id
    ? await admin
        .from("categories")
        .select("name, slug")
        .eq("id", demand.category_id)
        .maybeSingle<{ name: string; slug: string }>()
    : { data: null };

  // attachment_url armazena só o object_path (SecRev C1 — 2026-05-14).
  // URL pública é construída server-side aqui. RLS no Storage gate-keeps o acesso real.
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BuyAction",
    name: demand.title,
    description: demand.description,
    object: { "@type": "Product", name: demand.title, category: category?.name },
    location: location ? { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: demand.delivery_city, addressRegion: demand.delivery_state } } : undefined,
    url: `${APP_URL}/necessidade/${slug}`,
    datePublished: demand.published_at,
  };

  return (
    <article className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/buscar"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar às necessidades
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {category && (
            <Link
              href={`/categoria/${category.slug}`}
              className="inline-flex items-center rounded-full bg-[color:var(--brand-green-50)] px-2.5 py-1 text-xs font-semibold text-[color:var(--brand-green-700)] hover:bg-[color:var(--brand-green-100)]"
            >
              {category.name}
            </Link>
          )}
          {demand.kind === "structured" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--brand-green-300)] bg-white px-2.5 py-1 text-xs font-semibold text-[color:var(--brand-green-700)]">
              <FileCheck2 className="h-3.5 w-3.5" /> Proposta estruturada
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900">
          {demand.title}
        </h1>
        <p className="text-sm text-slate-500">
          {formatRelative(demand.published_at)} ·{" "}
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {demand.views_count}
          </span>{" "}
          ·{" "}
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" /> {demand.contact_count} contatos
          </span>
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Coluna principal */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Descrição
            </h2>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-slate-700">
              {demand.description}
            </p>
          </section>

          {demand.kind === "structured" && demand.items && demand.items.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                <ListChecks className="h-4 w-4" /> Itens do pedido
              </h2>
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
            </section>
          )}

          {demand.kind === "structured" &&
            (demand.payment_terms || demand.delivery_terms || demand.required_docs) && (
              <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
              </section>
            )}

          {attachmentPublicUrl && (
            <section className="rounded-2xl border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[color:var(--brand-green-700)]">
                Pedido formal (PDF)
              </h2>
              <a
                href={attachmentPublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[color:var(--brand-green-700)] border border-[color:var(--brand-green-300)] hover:bg-[color:var(--brand-green-100)]"
              >
                <FileText className="h-4 w-4" /> Baixar PDF
              </a>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Detalhes
            </h2>
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
              <Detail icon={<span className="font-bold text-slate-400">R$</span>} label="Orçamento máximo">
                {budget ? `até ${budget}` : "Sem orçamento informado"}
              </Detail>
            </dl>
          </section>
        </div>

        {/* Coluna lateral — CTA WhatsApp */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] p-6 sticky top-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--brand-green-700)]">
              Sou vendedor
            </p>
            <h3 className="mt-2 text-lg font-bold text-slate-900">
              Atende essa necessidade?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Vendedores assinantes contatam o comprador direto pelo WhatsApp, com a mensagem já
              pré-formatada.
            </p>

            <div className="mt-4">
              <ContactButton
                demandId={demand.id}
                canContact={viewerSupplier?.canContact ?? false}
                hasSupplier={!!viewerSupplier}
              />
            </div>

            {!viewerSupplier?.canContact && (
              <p className="mt-3 text-xs text-slate-500">
                Disponível para vendedores com assinatura ativa.
              </p>
            )}

            {!viewerSupplier && (
              <Link
                href="/seja-vendedor"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--brand-green-300)] bg-white px-4 py-2.5 text-sm font-semibold text-[color:var(--brand-green-700)] hover:bg-[color:var(--brand-green-50)]"
              >
                Ver planos de vendedor
              </Link>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-500">
            <p>
              <strong className="text-slate-700">Publicação válida</strong> até{" "}
              {formatDate(demand.expires_at)}. Após essa data, a necessidade some do feed
              automaticamente.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}

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
      <span className="mt-0.5 text-slate-400">{icon}</span>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function formatRelative(value: string) {
  const ms = Date.now() - new Date(value).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Publicado hoje";
  if (days === 1) return "Publicado ontem";
  if (days < 7) return `Publicado há ${days} dias`;
  if (days < 30) return `Publicado há ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? "s" : ""}`;
  return `Publicado em ${formatDate(value)}`;
}
