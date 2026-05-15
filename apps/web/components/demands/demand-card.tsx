import Link from "next/link";
import { BadgeCheck, CalendarClock, FileCheck2, MapPin, Package, Eye, MessageCircle } from "lucide-react";
import type { DemandPublic } from "@/lib/services/demands";

interface DemandCardProps {
  demand: DemandPublic;
  /** Categoria mostrada no card (lookup pela página, default = null) */
  categoryName?: string | null;
}

export function DemandCard({ demand, categoryName }: DemandCardProps) {
  const location = [demand.delivery_city, demand.delivery_state].filter(Boolean).join(", ") || "—";
  const deadline = demand.deadline ? formatDate(demand.deadline) : null;
  const budget = demand.budget_max_cents ? formatBRL(demand.budget_max_cents) : null;
  const quantity =
    demand.quantity != null
      ? `${demand.quantity.toLocaleString("pt-BR")}${demand.unit ? ` ${demand.unit}` : ""}`
      : null;
  const publishedAgo = formatRelative(demand.published_at);

  return (
    <Link
      href={`/necessidade/${demand.slug}`}
      className={`group flex flex-col rounded-2xl border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
        demand.buyer_is_verified
          ? "border-[color:var(--brand-green-200)] hover:border-[color:var(--brand-green-400)] ring-1 ring-[color:var(--brand-green-100)]"
          : "border-slate-200 hover:border-[color:var(--brand-green-300)]"
      }`}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {demand.buyer_is_verified && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-green-600)] px-2 py-0.5 text-[11px] font-semibold text-white"
              title="Comprador verificado — CNPJ e razão social confirmados"
            >
              <BadgeCheck className="h-3 w-3" /> Verificado
            </span>
          )}
          {categoryName && (
            <span className="inline-flex items-center rounded-full bg-[color:var(--brand-green-50)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--brand-green-700)]">
              {categoryName}
            </span>
          )}
          {demand.kind === "structured" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--brand-green-300)] bg-white px-2 py-0.5 text-[11px] font-semibold text-[color:var(--brand-green-700)]">
              <FileCheck2 className="h-3 w-3" /> Proposta estruturada
            </span>
          )}
        </div>
        <h3 className="text-base font-bold leading-snug text-slate-900 line-clamp-2 group-hover:text-[color:var(--brand-green-700)]">
          {demand.title}
        </h3>
        <p className="text-sm text-slate-600 line-clamp-2">{demand.description}</p>
        {demand.kind === "structured" && demand.items && demand.items.length > 0 && (
          <ul className="space-y-0.5 text-xs text-slate-500">
            {demand.items.slice(0, 2).map((it, i) => (
              <li key={i} className="flex items-baseline gap-1.5 truncate">
                <span className="text-slate-400">•</span>
                <span className="truncate">
                  <span className="font-medium text-slate-700">{it.quantity.toLocaleString("pt-BR")} {it.unit}</span> · {it.description}
                </span>
              </li>
            ))}
            {demand.items.length > 2 && (
              <li className="text-[11px] italic text-slate-400">
                + {demand.items.length - 2} {demand.items.length - 2 === 1 ? "item" : "itens"}
              </li>
            )}
          </ul>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
        {quantity && (
          <Row icon={<Package className="h-3.5 w-3.5" />} label="Quantidade" value={quantity} />
        )}
        {deadline && (
          <Row icon={<CalendarClock className="h-3.5 w-3.5" />} label="Prazo" value={`até ${deadline}`} />
        )}
        <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Local" value={location} />
        {budget && <Row icon={<span className="font-bold">R$</span>} label="Orçamento" value={`até ${budget}`} />}
      </dl>

      <footer className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
        <span>{publishedAgo}</span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" /> {demand.views_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> {demand.contact_count}
          </span>
        </span>
      </footer>
    </Link>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate font-medium text-slate-700">{value}</p>
      </div>
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
  if (days <= 0) return "publicado hoje";
  if (days === 1) return "publicado ontem";
  if (days < 7) return `publicado há ${days} dias`;
  if (days < 30) return `publicado há ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? "s" : ""}`;
  return `publicado em ${formatDate(value)}`;
}
