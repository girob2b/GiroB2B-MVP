"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  Building2,
  MapPin,
  CalendarDays,
  MessageSquare,
  Package,
  Loader2,
  AlertCircle,
  ClipboardList,
  ExternalLink,
} from "lucide-react";
import { formatPriceBRL } from "@/lib/format-price";

// ─── Tipos (espelham o contrato 00-contrato.md) ───────────────────────────────

interface ReceivedOffer {
  contact_id: string;
  clicked_at: string;
  supplier: {
    id: string;
    trade_name: string | null;
    company_name: string | null;
    slug: string | null;
    city: string | null;
    state: string | null;
  };
  offer: {
    price_cents: number | null;
    deadline: string | null;
    message: string | null;
  };
}

interface ReceivedOfferGroup {
  demand: {
    id: string;
    slug: string;
    title: string;
    status: string;
    category_id: string | null;
  };
  offers: ReceivedOffer[];
}

type FetchState =
  | { status: "loading" }
  | { status: "error"; reason: string }
  | { status: "success"; data: ReceivedOfferGroup[] };

// ─── Status labels ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  open: "Aberta",
  negotiating: "Em negociação",
  fulfilled: "Resolvida",
  cancelled: "Cancelada",
  expired: "Expirada",
};

const STATUS_TONE: Record<string, string> = {
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  negotiating: "bg-blue-50 text-blue-700 border-blue-200",
  fulfilled: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-amber-50 text-amber-700 border-amber-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDeadline(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatClickedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function supplierDisplayName(supplier: ReceivedOffer["supplier"]): string {
  return supplier.trade_name ?? supplier.company_name ?? "Vendedor";
}

// ─── Componente principal ────────────────────────────────────────────────────

export function ReceivedOffersInbox() {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/buyer/inboxes/received", { cache: "no-store" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { reason?: string };
          if (!cancelled) {
            setState({
              status: "error",
              reason:
                res.status === 401
                  ? "Sessão expirada. Faça login novamente."
                  : body.reason === "internal"
                    ? "Erro interno. Tente novamente em instantes."
                    : "Não foi possível carregar as ofertas.",
            });
          }
          return;
        }
        const json = (await res.json()) as
          | { ok: true; data: ReceivedOfferGroup[] }
          | { ok: false; reason: string };
        if (!cancelled) {
          if (json.ok) {
            setState({ status: "success", data: json.data });
          } else {
            setState({ status: "error", reason: "Não foi possível carregar as ofertas." });
          }
        }
      } catch {
        if (!cancelled) {
          setState({ status: "error", reason: "Falha de conexão. Verifique sua internet." });
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" aria-hidden="true" />
        <span className="text-sm">Carregando ofertas…</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-400 mb-3" aria-hidden="true" />
        <p className="text-base font-semibold text-red-900">Não foi possível carregar</p>
        <p className="mt-1 text-sm text-red-700">{state.reason}</p>
        <button
          type="button"
          onClick={() => setState({ status: "loading" })}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const { data } = state;

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
        <Inbox className="mx-auto h-10 w-10 text-slate-300 mb-4" aria-hidden="true" />
        <p className="text-base font-semibold text-slate-900">Nenhuma oferta recebida ainda</p>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
          Quando um vendedor contatá-lo via WhatsApp, a oferta aparece aqui — agrupada por demanda.
        </p>
        <Link
          href="/painel/necessidades"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          Ver minhas demandas
        </Link>
      </div>
    );
  }

  const totalOffers = data.reduce((n, g) => n + g.offers.length, 0);

  return (
    <div className="space-y-3">
      {/* Contagem */}
      <p className="text-sm text-slate-500" aria-live="polite">
        {totalOffers} oferta{totalOffers === 1 ? "" : "s"} recebida{totalOffers === 1 ? "" : "s"}
        {" "}em{" "}
        {data.length} demanda{data.length === 1 ? "" : "s"}
      </p>

      <ul className="space-y-5" aria-label="Ofertas recebidas por demanda">
        {data.map((group) => (
          <DemandGroup key={group.demand.id} group={group} />
        ))}
      </ul>
    </div>
  );
}

// ─── Grupo por demanda ────────────────────────────────────────────────────────

function DemandGroup({ group }: { group: ReceivedOfferGroup }) {
  const { demand, offers } = group;
  const statusTone = STATUS_TONE[demand.status] ?? "bg-slate-100 text-slate-700 border-slate-200";
  const statusLabel = STATUS_LABEL[demand.status] ?? demand.status;

  return (
    <li className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Cabeçalho da demanda */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
        <div className="min-w-0">
          <Link
            href={`/necessidade/${demand.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-900 hover:underline inline-flex items-center gap-1.5 leading-snug"
          >
            {demand.title}
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          </Link>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusTone}`}
          >
            {statusLabel}
          </span>
          <span className="text-xs text-slate-500">
            {offers.length} oferta{offers.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Lista de ofertas */}
      <ul className="divide-y divide-slate-100">
        {offers.map((offer) => (
          <OfferRow key={offer.contact_id} offer={offer} />
        ))}
      </ul>
    </li>
  );
}

// ─── Linha de oferta individual ───────────────────────────────────────────────

function OfferRow({ offer }: { offer: ReceivedOffer }) {
  const { supplier, offer: o, clicked_at } = offer;
  const supplierName = supplierDisplayName(supplier);
  const location = [supplier.city, supplier.state].filter(Boolean).join(", ");

  return (
    <li className="px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        {/* Ícone decorativo */}
        <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Building2 className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Fornecedor + data */}
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {supplier.slug ? (
                <Link
                  href={`/fornecedor/${supplier.slug}`}
                  className="font-semibold text-slate-900 hover:underline"
                >
                  {supplierName}
                </Link>
              ) : (
                <span className="font-semibold text-slate-900">{supplierName}</span>
              )}
              {location && (
                <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {location}
                </p>
              )}
            </div>
            <time
              dateTime={clicked_at}
              className="shrink-0 text-xs text-slate-400 sm:text-right"
            >
              {formatClickedAt(clicked_at)}
            </time>
          </div>

          {/* Detalhes da oferta */}
          <div className="rounded-xl bg-slate-50 px-4 py-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Oferta recebida
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {o.price_cents !== null ? (
                <div className="flex items-center gap-1.5 text-sm">
                  <Package className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span className="font-semibold text-brand-700">
                    {formatPriceBRL(o.price_cents)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Package className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Preço não informado</span>
                </div>
              )}

              {o.deadline !== null ? (
                <div className="flex items-center gap-1.5 text-sm text-slate-700">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span>Prazo: {formatDeadline(o.deadline)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Prazo não informado</span>
                </div>
              )}
            </div>

            {o.message && (
              <div className="flex items-start gap-1.5 text-sm text-slate-700">
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                <p className="leading-relaxed line-clamp-4">{o.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
