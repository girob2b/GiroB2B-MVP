import type React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarClock,
  Eye,
  FileCheck2,
  Megaphone,
  MapPin,
  Package,
  Wallet,
  Zap,
} from "lucide-react";
import type { DemandPublic } from "@/lib/services/demands";
import { formatPriceBRL } from "@/lib/format-price";

interface DemandCardProps {
  demand: DemandPublic;
  /** Categoria mostrada no card (lookup pela página, default = null) */
  categoryName?: string | null;
  /**
   * Slot de ação — renderizado abaixo do card (fora do <Link> para evitar aninhamento).
   * Passa `null` para omitir. Se omitido, nenhuma ação é renderizada.
   *
   * Uso:
   * - Superfícies públicas: `<PublicContactGate />` (link → /seja-vendedor)
   * - Feed do vendedor (/painel/leads): `<ContactButton />` (gate de assinatura)
   * - Detalhe / relacionadas: omitir ou passar null
   */
  action?: React.ReactNode;
}

/**
 * Card canônico de DEMANDA — um "anúncio de procura-se" postado por um comprador.
 *
 * ── Identidade visual (ux-audit 2026-06-22) ──────────────────────────────────
 * Uma demanda é uma NECESSIDADE, não um perfil de empresa. O card é desenhado
 * para GRITAR isso e ser inconfundível ao lado do MockCompanyCard/PublicCompanyCard
 * (que são perfis teal/slate com avatar de prédio):
 *
 *   - Acento ÂMBAR/DOURADO (gold-*) em vez do teal das empresas.
 *   - Eyebrow "DEMANDA ABERTA" com ícone de megafone (procura-se), não avatar.
 *   - Barra de identidade no topo dourada + faixa lateral.
 *   - Bloco de METADADOS DECISIVOS (qtd · orçamento · prazo) — o que faz o
 *     vendedor decidir contatar (Baymard: a info que decide vai em destaque),
 *     com FALLBACK gracioso quando o campo é null (orçamento/qtd são opcionais).
 *   - Prova social orientada ao vendedor ("N já viram / contataram").
 *   - CTA com a cara do WhatsApp (verde), via slot `action`.
 *
 * Princípio: o card é um teaser. Detalhes completos (itens, documentos,
 * descrição) ficam na página de detalhe (/necessidade/[slug]).
 *
 * Estrutura fixa para altura uniforme (flex flex-col h-full):
 *   1. Eyebrow "DEMANDA ABERTA" + linha de badges (verificado / nova / estruturada)
 *   2. Título da necessidade em destaque (ocupa o espaço — ancora a altura)
 *   3. Metadados decisivos (qtd / orçamento / prazo, com fallback) + categoria/local
 *   4. Footer fixado embaixo: recência + prova social do lado vendedor
 *   5. Slot de ação fora do <Link> (sem link aninhado)
 *
 * Regra de anonimização: nunca renderiza PII do comprador.
 */
export function DemandCard({ demand, categoryName, action }: DemandCardProps) {
  const location = demand.delivery_state
    ? [demand.delivery_city, demand.delivery_state].filter(Boolean).join(", ")
    : null;

  const quantity =
    demand.quantity != null
      ? `${demand.quantity.toLocaleString("pt-BR")}${demand.unit ? ` ${demand.unit}` : ""}`
      : null;
  const budget =
    demand.budget_max_cents != null ? formatPriceBRL(demand.budget_max_cents) : null;
  const deadline = demand.deadline ? formatDeadline(demand.deadline) : null;

  const publishedAgo = formatRelative(demand.published_at);
  const isNew = isRecentlyPublished(demand.published_at);

  // Prova social: contatos quando houver; senão "X já viram" (views) — sempre
  // dá ao vendedor um sinal de tração sem deixar buraco visual.
  const contactCount = demand.contact_count ?? 0;
  const viewsCount = demand.views_count ?? 0;

  return (
    <div className="flex h-full flex-col gap-0">
      <Link
        href={`/necessidade/${demand.slug}`}
        className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gold-200 bg-white pl-1.5 transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-[0_6px_20px_-6px_rgb(180_120_10/0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 ${
          action != null ? "rounded-b-none border-b-0" : ""
        }`}
      >
        {/* Faixa de identidade lateral (dourada) — marca de "demanda" */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1.5 bg-linear-to-b from-gold-400 to-gold-600"
        />

        <div className="flex h-full flex-col bg-linear-to-b from-gold-50/70 to-white px-4 pb-4 pt-4">
          {/* ── 1. Eyebrow "DEMANDA ABERTA" + badges ─────────────────────── */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gold-700">
              <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
              Demanda aberta
            </span>
            {isNew && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-gold-500 px-2 py-0.5 text-[11px] font-bold text-white animate-in fade-in"
                aria-label="Publicada recentemente"
              >
                <Zap className="h-3 w-3" aria-hidden="true" /> Nova
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {demand.buyer_is_verified && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white"
                title="Comprador verificado — CNPJ e razão social confirmados"
                aria-label="Comprador verificado"
              >
                <BadgeCheck className="h-3 w-3" aria-hidden="true" /> Comprador verificado
              </span>
            )}
            {demand.kind === "structured" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-gold-800">
                <FileCheck2 className="h-3 w-3" aria-hidden="true" /> Proposta estruturada
              </span>
            )}
          </div>

          {/* ── 2. Título da necessidade — destaque, ancora a altura ──────── */}
          <h3 className="mt-3 text-base font-bold leading-snug text-slate-900 line-clamp-3 group-hover:text-gold-800">
            {demand.title}
          </h3>

          {/* ── 3. Metadados decisivos (qtd · orçamento · prazo) ──────────── */}
          <dl className="mt-3 flex flex-1 flex-col gap-1.5">
            {quantity ? (
              <MetaRow icon={Package} label="Quantidade" value={quantity} />
            ) : null}
            {budget ? (
              <MetaRow icon={Wallet} label="Orçamento" value={`até ${budget}`} />
            ) : null}
            {deadline ? (
              <MetaRow icon={CalendarClock} label="Prazo" value={deadline} />
            ) : null}
            {/* Categoria + local como linha de contexto (sempre presente) */}
            {(categoryName || location) && (
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                {categoryName && (
                  <span className="inline-flex items-center rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-semibold text-gold-800">
                    {categoryName}
                  </span>
                )}
                {location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin
                      className="h-3.5 w-3.5 shrink-0 text-gold-500"
                      aria-hidden="true"
                    />
                    {location}
                  </span>
                )}
              </p>
            )}
          </dl>

          {/* ── 4. Footer: recência + prova social do lado vendedor ───────── */}
          <footer className="mt-auto flex items-center justify-between gap-2 border-t border-gold-100 pt-3 text-[11px] font-medium text-slate-500">
            <span>{publishedAgo}</span>
            {contactCount > 0 ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 font-semibold text-gold-800"
                title={`${contactCount} vendedor${contactCount === 1 ? "" : "es"} já contatou`}
              >
                <Megaphone className="h-3 w-3" aria-hidden="true" />
                {contactCount} contataram
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-slate-500"
                title={`${viewsCount} visualizaç${viewsCount === 1 ? "ão" : "ões"}`}
              >
                <Eye className="h-3 w-3" aria-hidden="true" />
                {viewsCount} já viram
              </span>
            )}
          </footer>
        </div>
      </Link>

      {/* ── 5. Slot de ação — fora do <Link> para evitar link aninhado ───── */}
      {action != null && (
        <div className="rounded-b-2xl border border-t-0 border-gold-200 bg-white pl-1.5">
          <div className="px-4 pb-4 pt-3">{action}</div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

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

// ─── Utilitários ──────────────────────────────────────────────────────────────

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDeadline(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatRelative(value: string) {
  const ms = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (minutes < 60) return "publicada agora";
  if (hours < 24) return `publicada há ${hours}h`;
  if (days <= 0) return "publicada hoje";
  if (days === 1) return "publicada ontem";
  if (days < 7) return `publicada há ${days} dias`;
  if (days < 30)
    return `publicada há ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? "s" : ""}`;
  return `publicada em ${formatDate(value)}`;
}

/**
 * Retorna true se a demanda foi publicada há menos de 6 horas.
 * Usado para o badge "Nova" (#13 — sinal informativo pro vendedor).
 */
function isRecentlyPublished(publishedAt: string): boolean {
  const ms = Date.now() - new Date(publishedAt).getTime();
  return ms < 6 * 60 * 60 * 1000;
}
