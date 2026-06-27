/**
 * Função de scoring do Comparador de Cotações — Fase 2a.
 *
 * LÓGICA PURA — sem I/O, sem estado global.
 * Recebe cotações brutas + localização da demanda + preferências do comprador
 * e devolve as cotações com score e breakdown, ordenadas por score desc.
 *
 * Score = soma ponderada de 3 fatores normalizados (0–1 cada):
 *
 *   price:    menor price_cents = melhor.
 *             Normalizado no range [min, max] das cotações da demanda.
 *             0.0 quando price_cents é null (penaliza ausência de dado).
 *
 *   deadline: prazo mais curto = melhor.
 *             Convertido em dias a partir de `today`.
 *             Normalizado no range [min, max] de dias das cotações.
 *             0.0 quando deadline é null (penaliza ausência de dado).
 *             Prazo passado → 0 dias (equivale a entrega imediata — score 1.0).
 *
 *   distance: mesma cidade = 1.0 | mesmo estado = 0.5 | outro estado = 0.0.
 *             0.5 quando demand.delivery_state é null (neutro — sem info de destino).
 *             0.0 quando o supplier não tem localização cadastrada.
 *
 * Pagamento: flag de match (NÃO entra no score ponderado).
 *   true  — a oferta aceita ao menos um método da preferência do comprador.
 *   true  — quando o comprador não tem preferência (paymentPreference vazio).
 *   false — quando a oferta não informa métodos (null) e o comprador tem preferência.
 *
 * Reputação (supplier.is_verified): exposta como metadata no resultado.
 *   NÃO entra no score desta fase — adiado para Fase 2b.
 *   Fonte: suppliers.is_verified (migration 001).
 *   Quando houver sistema de rating, this será substituído/complementado.
 *
 * @module lib/ranking/score
 */

import {
  DEFAULT_RANKING_WEIGHTS,
  type RankingWeights,
} from "@/lib/schemas/comparator";

// ─── Tipos de entrada ─────────────────────────────────────────────────────────

export interface OfferForScoring {
  contact_id: string;
  clicked_at: string;
  offer: {
    price_cents: number | null;
    /** Prazo prometido pelo vendedor — ISO YYYY-MM-DD — ou null se não informado. */
    deadline: string | null;
    message: string | null;
    payment_methods: string[] | null;
  };
  supplier: {
    id: string;
    trade_name: string | null;
    company_name: string | null;
    slug: string | null;
    city: string | null;
    state: string | null;
    /** Vendedor verificado pela plataforma. Exposto como metadata; não pesa no score (Fase 2b). */
    is_verified: boolean;
  };
}

export interface DemandForScoring {
  /** Cidade de entrega preferida pelo comprador. null = sem preferência de localização. */
  delivery_city: string | null;
  /** UF de entrega preferida pelo comprador (CHAR(2) maiúsculo). null = sem preferência. */
  delivery_state: string | null;
}

// ─── Tipos de saída ──────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  /** Score normalizado 0–1 do fator preço. 0.0 quando price_cents é null. */
  price: number;
  /** Score normalizado 0–1 do fator prazo. 0.0 quando deadline é null. */
  deadline: number;
  /** Score 0.0, 0.5 ou 1.0 do fator distância. 0.5 quando delivery_state é null. */
  distance: number;
}

export interface ScoredOfferResult {
  contact_id: string;
  clicked_at: string;
  /** Score composto: soma ponderada dos três fatores (0–1). Arredondado em 4 casas. */
  score: number;
  breakdown: ScoreBreakdown;
  /**
   * A cotação aceita ao menos um método da preferência de pagamento do comprador.
   * true quando o comprador não tem preferência declarada (tudo casa).
   */
  payment_match: boolean;
  supplier: OfferForScoring["supplier"];
  offer: OfferForScoring["offer"];
}

// ─── Função principal ────────────────────────────────────────────────────────

/**
 * Calcula o score de cada cotação e retorna o array ordenado por score desc.
 *
 * Determinístico: mesmo input → mesmo output. Seguro para cache ou memorização.
 *
 * @param offers            - cotações da demanda (todas — independente de status).
 * @param demand            - localização de entrega da demanda.
 * @param weights           - pesos dos fatores (default: price 0.5, deadline 0.3, distance 0.2).
 * @param paymentPreference - métodos preferidos pelo comprador ([] = sem preferência).
 * @param today             - data de referência para cálculo de dias de prazo.
 *                            Padrão: new Date(). Injetável para facilitar testes.
 */
export function scoreOffers(
  offers: OfferForScoring[],
  demand: DemandForScoring,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
  paymentPreference: string[] = [],
  today: Date = new Date()
): ScoredOfferResult[] {
  if (offers.length === 0) return [];

  // ── 1. Pré-computa valores brutos para normalização ──────────────────────

  // Preço: min/max entre ofertas com price_cents não-null.
  const prices = offers
    .map((o) => o.offer.price_cents)
    .filter((p): p is number => p !== null);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const priceRange = maxPrice - minPrice;

  // Prazo: converte deadline → dias a partir de hoje (midnight local).
  // Dias negativos (prazo passado) → 0 (equivale a entrega imediata).
  const todayNorm = new Date(today);
  todayNorm.setHours(0, 0, 0, 0);
  const todayMs = todayNorm.getTime();

  const deadlineDaysList: (number | null)[] = offers.map((o) => {
    if (!o.offer.deadline) return null;
    const d = new Date(o.offer.deadline);
    if (isNaN(d.getTime())) return null; // data inválida → null
    const diffMs = d.getTime() - todayMs;
    return Math.max(0, Math.round(diffMs / 86_400_000));
  });

  const validDays = deadlineDaysList.filter((d): d is number => d !== null);
  const minDays = validDays.length > 0 ? Math.min(...validDays) : 0;
  const maxDays = validDays.length > 0 ? Math.max(...validDays) : 0;
  const dayRange = maxDays - minDays;

  // ── 2. Score individual por oferta ────────────────────────────────────────

  const scored = offers.map((offer, idx): ScoredOfferResult => {
    // Fator preço
    const priceCents = offer.offer.price_cents;
    let priceScore = 0.0;
    if (priceCents !== null) {
      priceScore =
        priceRange > 0
          ? (maxPrice - priceCents) / priceRange
          : 1.0; // único preço ou todos iguais → melhor possível
    }

    // Fator prazo
    const days = deadlineDaysList[idx];
    let deadlineScore = 0.0;
    if (days !== null) {
      deadlineScore =
        dayRange > 0
          ? (maxDays - days) / dayRange
          : 1.0; // único prazo ou todos iguais → melhor possível
    }

    // Fator distância
    let distanceScore: 0.0 | 0.5 | 1.0 = 0.0;
    if (demand.delivery_state === null) {
      // Sem info de destino: neutro pra todos
      distanceScore = 0.5;
    } else if (!offer.supplier.state) {
      // Supplier sem localização: pior caso
      distanceScore = 0.0;
    } else if (norm(offer.supplier.state) === norm(demand.delivery_state)) {
      // Mesmo estado — verifica cidade
      if (
        offer.supplier.city !== null &&
        demand.delivery_city !== null &&
        norm(offer.supplier.city) === norm(demand.delivery_city)
      ) {
        distanceScore = 1.0; // mesma cidade
      } else {
        distanceScore = 0.5; // mesmo estado, cidade diferente ou ausente
      }
    } else {
      distanceScore = 0.0; // estado diferente
    }

    // Score composto
    const rawScore =
      priceScore * weights.price +
      deadlineScore * weights.deadline +
      distanceScore * weights.distance;

    // Arredonda em 4 casas decimais (evita noise de float)
    const score = round4(rawScore);

    // Payment match
    const payment_match =
      paymentPreference.length === 0
        ? true // sem preferência declarada → tudo casa
        : (offer.offer.payment_methods ?? []).some((m) =>
            paymentPreference.includes(m)
          );

    return {
      contact_id: offer.contact_id,
      clicked_at: offer.clicked_at,
      score,
      breakdown: {
        price: round4(priceScore),
        deadline: round4(deadlineScore),
        distance: distanceScore,
      },
      payment_match,
      supplier: offer.supplier,
      offer: offer.offer,
    };
  });

  // ── 3. Ordena desc por score (melhor primeiro) ───────────────────────────
  return scored.sort((a, b) => b.score - a.score);
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

/** Normaliza string para comparação: minúsculas, sem espaços extras. */
function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Arredonda para 4 casas decimais. */
function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
