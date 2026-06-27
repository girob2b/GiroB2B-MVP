"use client";

/**
 * DemandComparator — cliente do GET /api/buyer/comparator/[demandId].
 *
 * Exibe as cotações de uma demanda ranqueadas por score ponderado.
 * Fase 2a do Comparador de Cotações (feat/comparador-cotacoes, 2026-06-27).
 *
 * Estados cobertos: loading inline | error com retry | empty state | lista ranqueada.
 *
 * Tipos definidos localmente (espelham DemandComparatorResult / ScoredOfferResult)
 * para evitar importar o módulo server-only lib/services/comparator.ts em contexto
 * de Client Component.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  Building2,
  MapPin,
  CalendarDays,
  Package,
  CreditCard,
  ShieldCheck,
  MessageSquare,
  Trophy,
  Inbox,
  BarChart2,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";
import { formatPriceBRL } from "@/lib/format-price";

// ── Local types (espelham o contrato do Route Handler) ────────────────────────

interface ScoreBreakdown {
  price: number;    // 0–1
  deadline: number; // 0–1
  distance: number; // 0, 0.5 ou 1
}

interface RankingWeights {
  price: number;
  deadline: number;
  distance: number;
}

interface ScoredOffer {
  contact_id: string;
  clicked_at: string;
  /** Score composto 0–1 (4 casas decimais). */
  score: number;
  breakdown: ScoreBreakdown;
  /**
   * true quando a oferta aceita ao menos um método da preferência do comprador,
   * ou quando o comprador não tem preferência declarada.
   */
  payment_match: boolean;
  supplier: {
    id: string;
    trade_name: string | null;
    company_name: string | null;
    slug: string | null;
    city: string | null;
    state: string | null;
    /** Metadata de verificação — NÃO entra no score desta fase. */
    is_verified: boolean;
  };
  offer: {
    price_cents: number | null;
    deadline: string | null;
    message: string | null;
    payment_methods: string[] | null;
  };
}

interface ComparatorData {
  demand: {
    id: string;
    slug: string;
    title: string;
    status: string;
    delivery_city: string | null;
    delivery_state: string | null;
  };
  weights_used: RankingWeights;
  payment_preference_used: string[];
  /** Já ordenado por score desc (melhor primeiro). */
  offers: ScoredOffer[];
}

type FetchState =
  | { status: "loading" }
  | { status: "error"; reason: string }
  | { status: "success"; data: ComparatorData };

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAYMENT_LABELS: Record<string, string> = {
  a_vista: "À vista",
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão",
  parcelado: "Parcelado",
  faturado_30d: "Fat. 30d",
};

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function supplierDisplayName(s: ScoredOffer["supplier"]): string {
  return s.trade_name ?? s.company_name ?? "Vendedor";
}

// ── Barra de breakdown por fator ──────────────────────────────────────────────

function FactorBar({
  label,
  value,
  weight,
  colorClass,
}: {
  label: string;
  value: number;
  weight: number;
  colorClass: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          {label}{" "}
          <span className="text-slate-400">(peso {pct(weight)})</span>
        </span>
        <span className="font-semibold text-slate-700">{pct(value)}</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={Math.round(value * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct(value)}`}
      >
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  );
}

function BreakdownBars({
  breakdown,
  weights,
}: {
  breakdown: ScoreBreakdown;
  weights: RankingWeights;
}) {
  return (
    <div className="space-y-2.5">
      <FactorBar
        label="Preço"
        value={breakdown.price}
        weight={weights.price}
        colorClass="bg-brand-600"
      />
      <FactorBar
        label="Prazo"
        value={breakdown.deadline}
        weight={weights.deadline}
        colorClass="bg-gold-500"
      />
      <FactorBar
        label="Distância"
        value={breakdown.distance}
        weight={weights.distance}
        colorClass="bg-slate-400"
      />
    </div>
  );
}

// ── Card individual de cotação ─────────────────────────────────────────────────

function OfferCard({
  offer,
  rank,
  weights,
  isWinner,
}: {
  offer: ScoredOffer;
  rank: number;
  weights: RankingWeights;
  isWinner: boolean;
}) {
  const { supplier, offer: o } = offer;
  const name = supplierDisplayName(supplier);
  const location = [supplier.city, supplier.state].filter(Boolean).join(", ");
  const scorePercent = Math.round(offer.score * 100);

  return (
    <li
      className={`rounded-2xl border bg-white overflow-hidden ${
        isWinner
          ? "border-brand-400 ring-2 ring-brand-200 shadow-sm"
          : "border-slate-200"
      }`}
    >
      {/* Cabeçalho: rank + nome + badges + score */}
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b ${
          isWinner
            ? "bg-brand-50 border-brand-100"
            : "bg-slate-50 border-slate-100"
        }`}
      >
        {/* Rank + fornecedor */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              isWinner
                ? "bg-brand-600 text-white"
                : "bg-slate-200 text-slate-600"
            }`}
            aria-label={`Posição ${rank}`}
          >
            {rank}
          </div>
          <div className="min-w-0">
            {supplier.slug ? (
              <Link
                href={`/fornecedor/${supplier.slug}`}
                className="font-semibold text-slate-900 hover:underline"
              >
                {name}
              </Link>
            ) : (
              <span className="font-semibold text-slate-900">{name}</span>
            )}
            {location && (
              <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                {location}
              </p>
            )}
          </div>
        </div>

        {/* Badges + score */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isWinner && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gold-300 bg-gold-50 px-2.5 py-0.5 text-xs font-semibold text-gold-700">
              <Trophy className="h-3 w-3" aria-hidden="true" />
              Melhor cotação
            </span>
          )}
          {supplier.is_verified && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700"
              title="Empresa verificada pela plataforma. Não impacta o score nesta versão."
            >
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              Verificada
            </span>
          )}
          {offer.payment_match && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Aceita seu pagamento
            </span>
          )}
          {/* Score em círculo */}
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              isWinner
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
            title={`Score: ${scorePercent}%`}
            aria-label={`Score: ${scorePercent} de 100`}
          >
            {scorePercent}
          </span>
        </div>
      </div>

      {/* Corpo: dados da oferta + breakdown */}
      <div className="px-5 py-4 grid gap-5 sm:grid-cols-2">
        {/* Coluna esquerda: dados da oferta */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Oferta recebida
          </p>
          <div className="space-y-1.5">
            {o.price_cents !== null ? (
              <div className="flex items-center gap-1.5 text-sm">
                <Package className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="font-semibold text-brand-700">
                  {formatPriceBRL(o.price_cents)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                <Package className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Preço não informado</span>
              </div>
            )}

            {o.deadline !== null ? (
              <div className="flex items-center gap-1.5 text-sm text-slate-700">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                <span>Entrega até {fmtDate(o.deadline)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Prazo não informado</span>
              </div>
            )}

            {o.payment_methods && o.payment_methods.length > 0 && (
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-xs text-slate-400">
                  <CreditCard className="h-3 w-3 shrink-0" aria-hidden="true" />
                  Formas aceitas
                </p>
                <div className="flex flex-wrap gap-1">
                  {o.payment_methods.map((m) => (
                    <span
                      key={m}
                      className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                    >
                      {PAYMENT_LABELS[m] ?? m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {o.message && (
              <div className="flex items-start gap-1.5 text-sm text-slate-700">
                <MessageSquare
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <p className="leading-relaxed line-clamp-4">{o.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita: breakdown */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Score por fator
          </p>
          <BreakdownBars breakdown={offer.breakdown} weights={weights} />
        </div>
      </div>
    </li>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function DemandComparator({ demandId }: { demandId: string }) {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/buyer/comparator/${demandId}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            reason?: string;
          };
          if (!cancelled) {
            setState({
              status: "error",
              reason:
                res.status === 401
                  ? "Sessão expirada. Faça login novamente."
                  : res.status === 403
                    ? "Esta demanda não pertence à sua conta."
                    : res.status === 404
                      ? "Demanda não encontrada."
                      : body.reason === "internal"
                        ? "Erro interno. Tente novamente em instantes."
                        : "Não foi possível carregar o comparador.",
            });
          }
          return;
        }
        const json = (await res.json()) as
          | { ok: true; data: ComparatorData }
          | { ok: false; reason: string };
        if (!cancelled) {
          if (json.ok) {
            setState({ status: "success", data: json.data });
          } else {
            setState({
              status: "error",
              reason: "Não foi possível carregar o comparador.",
            });
          }
        }
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            reason: "Falha de conexão. Verifique sua internet.",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [demandId]);

  // ── Estados de loading / erro ─────────────────────────────────────────────

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" aria-hidden="true" />
        <span className="text-sm">Carregando comparador…</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
        <AlertCircle
          className="mx-auto h-8 w-8 text-red-400 mb-3"
          aria-hidden="true"
        />
        <p className="text-base font-semibold text-red-900">
          Não foi possível carregar
        </p>
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

  // ── Estado de sucesso ─────────────────────────────────────────────────────

  const { data } = state;
  const { offers, weights_used, payment_preference_used, demand } = data;

  // ── Empty state ───────────────────────────────────────────────────────────

  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
        <Building2
          className="mx-auto h-10 w-10 text-slate-300 mb-4"
          aria-hidden="true"
        />
        <p className="text-base font-semibold text-slate-900">
          Nenhuma cotação recebida ainda
        </p>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
          Quando vendedores enviarem cotações para{" "}
          <Link
            href={`/necessidade/${demand.slug}`}
            className="text-brand-700 underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            {demand.title}
          </Link>
          , elas aparecerão aqui ranqueadas pelo seu critério.
        </p>
        <Link
          href="/painel/necessidades/ofertas"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Inbox className="h-4 w-4" aria-hidden="true" />
          Ver todas as ofertas
        </Link>
      </div>
    );
  }

  const hasPaymentPref = payment_preference_used.length > 0;

  return (
    <div className="space-y-5">
      {/* Contexto: demanda + pesos usados + link de configuração */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
        <div className="flex items-start gap-2">
          <BarChart2
            className="h-4 w-4 shrink-0 text-slate-400 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-700">
              Ranqueamento de{" "}
              <Link
                href={`/necessidade/${demand.slug}`}
                className="text-brand-700 underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                {demand.title}
              </Link>
            </p>
            <p className="text-xs text-slate-500">
              Pesos — Preço:{" "}
              <strong className="text-slate-700">{pct(weights_used.price)}</strong> ·
              Prazo:{" "}
              <strong className="text-slate-700">{pct(weights_used.deadline)}</strong> ·
              Distância:{" "}
              <strong className="text-slate-700">{pct(weights_used.distance)}</strong>
              {hasPaymentPref && (
                <>
                  {" "}· Pagamento preferido:{" "}
                  <strong className="text-slate-700">
                    {payment_preference_used
                      .map((m) => PAYMENT_LABELS[m] ?? m)
                      .join(", ")}
                  </strong>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="ml-6">
          <Link
            href="/painel/perfil#ranking-prefs"
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
          >
            <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
            Configurar preferências de ranqueamento
          </Link>
        </div>
      </div>

      {/* Contagem */}
      <p className="text-sm text-slate-500" aria-live="polite">
        {offers.length} cotaç{offers.length === 1 ? "ão recebida" : "ões recebidas"}{" "}
        — ranqueadas pelo seu critério
      </p>

      {/* Lista ranqueada */}
      <ul className="space-y-4" aria-label="Cotações ranqueadas por score">
        {offers.map((offer, idx) => (
          <OfferCard
            key={offer.contact_id}
            offer={offer}
            rank={idx + 1}
            weights={weights_used}
            isWinner={idx === 0}
          />
        ))}
      </ul>

      {/* Nota de rodapé sobre verificação */}
      <p className="text-xs text-slate-400 text-center py-2">
        <ShieldCheck className="h-3 w-3 inline mr-1" aria-hidden="true" />
        O selo &ldquo;Verificada&rdquo; é metadata descritiva e não afeta o score nesta versão.
      </p>
    </div>
  );
}
