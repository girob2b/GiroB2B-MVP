"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  SendHorizonal,
  Building2,
  MapPin,
  CalendarDays,
  MessageSquare,
  Package,
  Loader2,
  AlertCircle,
  ClipboardList,
} from "lucide-react";
import { formatPriceBRL } from "@/lib/format-price";

// ─── Tipos (espelham o contrato 00-contrato.md) ───────────────────────────────

interface SentOffer {
  contact_id: string;
  clicked_at: string;
  demand: {
    id: string;
    slug: string;
    title: string;
    category_id: string | null;
    delivery_city: string | null;
    delivery_state: string | null;
  };
  buyer_company: string | null;
  offer: {
    price_cents: number | null;
    deadline: string | null;
    message: string | null;
  };
}

type FetchState =
  | { status: "loading" }
  | { status: "error"; reason: string }
  | { status: "success"; data: SentOffer[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDeadline(iso: string): string {
  // ISO YYYY-MM-DD → DD/MM/YYYY (sem fuso: split garante sem ajuste TZ)
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

// ─── Componente principal ────────────────────────────────────────────────────

export function SentOffersInbox() {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/supplier/inboxes/sent", { cache: "no-store" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { reason?: string };
          if (!cancelled) {
            setState({
              status: "error",
              reason:
                res.status === 401
                  ? "Sessão expirada. Faça login novamente."
                  : res.status === 403
                    ? "Você não tem acesso a esta área. Cadastre-se como vendedor."
                    : body.reason === "internal"
                      ? "Erro interno. Tente novamente em instantes."
                      : "Não foi possível carregar as propostas.",
            });
          }
          return;
        }
        const json = (await res.json()) as { ok: true; data: SentOffer[] } | { ok: false; reason: string };
        if (!cancelled) {
          if (json.ok) {
            setState({ status: "success", data: json.data });
          } else {
            setState({ status: "error", reason: "Não foi possível carregar as propostas." });
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
        <span className="text-sm">Carregando propostas…</span>
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
        <SendHorizonal className="mx-auto h-10 w-10 text-slate-300 mb-4" aria-hidden="true" />
        <p className="text-base font-semibold text-slate-900">Você ainda não enviou propostas</p>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
          Quando você contatar um comprador via WhatsApp, a proposta enviada aparece aqui — com empresa, preço e prazo.
        </p>
        <Link
          href="/painel/leads"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          Explorar demandas
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Contagem */}
      <p className="text-sm text-slate-500" aria-live="polite">
        {data.length} proposta{data.length === 1 ? "" : "s"} enviada{data.length === 1 ? "" : "s"}
      </p>

      <ul className="space-y-3" aria-label="Propostas enviadas">
        {data.map((item) => (
          <SentOfferCard key={item.contact_id} offer={item} />
        ))}
      </ul>
    </div>
  );
}

// ─── Card individual ──────────────────────────────────────────────────────────

function SentOfferCard({ offer }: { offer: SentOffer }) {
  const { demand, buyer_company, offer: o, clicked_at } = offer;

  const location = [demand.delivery_city, demand.delivery_state]
    .filter(Boolean)
    .join(", ");

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">

        {/* Ícone decorativo */}
        <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <SendHorizonal className="h-5 w-5" aria-hidden="true" />
        </div>

        {/* Corpo */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Demanda + empresa do comprador */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Link
                href={`/necessidade/${demand.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-900 hover:underline line-clamp-2 leading-snug"
              >
                {demand.title}
              </Link>
              {location && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {location}
                </p>
              )}
            </div>
            {/* Data do contato — alinhado à direita */}
            <time
              dateTime={clicked_at}
              className="shrink-0 text-xs text-slate-400 sm:text-right"
            >
              {formatClickedAt(clicked_at)}
            </time>
          </div>

          {/* Empresa do comprador */}
          <div className="flex items-center gap-1.5 text-sm text-slate-700">
            <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="font-medium">
              {buyer_company ?? (
                <span className="italic text-slate-400">Empresa não informada</span>
              )}
            </span>
          </div>

          {/* Oferta enviada */}
          <div className="rounded-xl bg-slate-50 px-4 py-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Proposta enviada
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
                <p className="leading-relaxed line-clamp-3">{o.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
