import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_RANKING_WEIGHTS,
  RankingWeightsSchema,
  UpdateBuyerRankingPrefsSchema,
  type RankingWeights,
  type UpdateBuyerRankingPrefsInput,
} from "@/lib/schemas/comparator";
import { OfferPaymentMethod } from "@/lib/schemas/leads";
import {
  scoreOffers,
  type DemandForScoring,
  type OfferForScoring,
  type ScoredOfferResult,
} from "@/lib/ranking/score";

// ─── Tipos públicos ──────────────────────────────────────────────────────────

export type { ScoredOfferResult } from "@/lib/ranking/score";
export type { ScoreBreakdown } from "@/lib/ranking/score";

export interface DemandComparatorResult {
  /** Dados básicos da demanda consultada. */
  demand: {
    id: string;
    slug: string;
    title: string;
    status: string;
    delivery_city: string | null;
    delivery_state: string | null;
  };
  /**
   * Pesos efetivamente aplicados no score.
   * Reflete a configuração do comprador ou os defaults quando não configurado.
   */
  weights_used: RankingWeights;
  /**
   * Preferência de pagamento efetivamente usada.
   * Array vazio quando o comprador não configurou preferência (todas as cotações matcham).
   */
  payment_preference_used: string[];
  /**
   * Cotações ranqueadas por score desc (melhor primeiro).
   * Inclui score, breakdown por fator, flag de match de pagamento e dados do supplier.
   * O campo supplier.is_verified está disponível como metadata (não entra no score — Fase 2b).
   */
  offers: ScoredOfferResult[];
}

// ─── getDemandComparator ──────────────────────────────────────────────────────

/**
 * Retorna as cotações de uma demanda ranqueadas pelo score ponderado do comparador.
 *
 * Segurança:
 *   - Verifica demands.buyer_user_id === buyerUserId ANTES de retornar qualquer dado.
 *   - Usa adminClient (service_role) — chamado APENAS via Route Handler autenticado
 *     que validou auth.uid() === buyerUserId antes de invocar este service.
 *   - PII do vendedor (trade_name, company_name, city, state) exposta APENAS no
 *     dashboard privado do comprador — não vaza em superfície pública.
 *
 * Erros lançados (mensagem literal, capturada pelo Route Handler):
 *   "demand_not_found"  — demanda não existe no banco.
 *   "demand_not_owned"  — demanda existe mas não pertence ao buyerUserId (403).
 *
 * @param demandId    - UUID da demanda.
 * @param buyerUserId - auth.uid() do comprador (validado pelo Route Handler antes de chamar).
 */
export async function getDemandComparator(
  demandId: string,
  buyerUserId: string
): Promise<DemandComparatorResult> {
  const admin = createAdminClient();

  // 1. Busca dados da demanda e preferências do comprador em paralelo.
  const [demandResult, buyerResult] = await Promise.all([
    admin
      .from("demands")
      .select(
        "id, slug, title, status, delivery_city, delivery_state, buyer_user_id"
      )
      .eq("id", demandId)
      .maybeSingle(),
    admin
      .from("buyers")
      .select("ranking_weights, payment_preference")
      .eq("user_id", buyerUserId)
      .maybeSingle(),
  ]);

  if (demandResult.error) throw new Error(demandResult.error.message);
  if (!demandResult.data) throw new Error("demand_not_found");

  const demand = demandResult.data as {
    id: string;
    slug: string;
    title: string;
    status: string;
    delivery_city: string | null;
    delivery_state: string | null;
    buyer_user_id: string | null;
  };

  // 2. Gate de segurança: verifica propriedade da demanda.
  if (demand.buyer_user_id !== buyerUserId) {
    throw new Error("demand_not_owned");
  }

  // 3. Resolve pesos e preferência de pagamento do comprador.
  //    buyerResult.data pode ser null (buyer sem perfil) → usa defaults.
  const buyerRow = buyerResult.data as {
    ranking_weights: unknown;
    payment_preference: unknown;
  } | null;

  // Valida JSONB do banco (pode estar malformado em migrações parciais).
  // Falha silenciosa → usa default, nunca quebra o endpoint.
  let weights: RankingWeights = DEFAULT_RANKING_WEIGHTS;
  if (buyerRow?.ranking_weights != null) {
    const parsed = RankingWeightsSchema.safeParse(buyerRow.ranking_weights);
    if (parsed.success) weights = parsed.data;
  }

  const VALID_METHODS = Object.values(
    OfferPaymentMethod.enum
  ) as string[];
  const paymentPreference: string[] = (() => {
    const raw = buyerRow?.payment_preference;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return (raw as unknown[]).filter(
      (m): m is string => typeof m === "string" && VALID_METHODS.includes(m)
    );
  })();

  // 4. Busca todas as cotações da demanda com dados completos do supplier.
  const { data: contactsData, error: contactsError } = await admin
    .from("demand_contacts")
    .select(
      `id,
       clicked_at,
       offer_price_cents,
       offer_deadline,
       offer_message,
       offer_payment_methods,
       suppliers!inner (
         id,
         trade_name,
         company_name,
         slug,
         city,
         state,
         is_verified
       )`
    )
    .eq("demand_id", demandId)
    .order("clicked_at", { ascending: false });

  if (contactsError) throw new Error(contactsError.message);

  type SupplierJoin = {
    id: string;
    trade_name: string | null;
    company_name: string | null;
    slug: string | null;
    city: string | null;
    state: string | null;
    is_verified: boolean;
  };
  type ContactRow = {
    id: string;
    clicked_at: string;
    offer_price_cents: number | null;
    offer_deadline: string | null;
    offer_message: string | null;
    offer_payment_methods: string[] | null;
    suppliers: SupplierJoin | SupplierJoin[];
  };

  const contacts = (contactsData ?? []) as unknown as ContactRow[];

  // 5. Normaliza o join (supabase-js pode retornar array ou objeto no !inner).
  const offersForScoring: OfferForScoring[] = contacts.map(
    (c): OfferForScoring => {
      const supplier = Array.isArray(c.suppliers) ? c.suppliers[0] : c.suppliers;
      return {
        contact_id: c.id,
        clicked_at: c.clicked_at,
        offer: {
          price_cents: c.offer_price_cents,
          deadline: c.offer_deadline,
          message: c.offer_message,
          payment_methods: c.offer_payment_methods,
        },
        supplier: {
          id: supplier.id,
          trade_name: supplier.trade_name,
          company_name: supplier.company_name,
          slug: supplier.slug,
          city: supplier.city,
          state: supplier.state,
          is_verified: supplier.is_verified ?? false,
        },
      };
    }
  );

  const demandForScoring: DemandForScoring = {
    delivery_city: demand.delivery_city,
    delivery_state: demand.delivery_state,
  };

  // 6. Aplica scoring (função pura — sem I/O).
  const scoredOffers = scoreOffers(
    offersForScoring,
    demandForScoring,
    weights,
    paymentPreference
  );

  return {
    demand: {
      id: demand.id,
      slug: demand.slug,
      title: demand.title,
      status: demand.status,
      delivery_city: demand.delivery_city,
      delivery_state: demand.delivery_state,
    },
    weights_used: weights,
    payment_preference_used: paymentPreference,
    offers: scoredOffers,
  };
}

// ─── updateBuyerRankingPrefs ──────────────────────────────────────────────────

export type UpdateBuyerRankingPrefsResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Persiste as preferências de ranking do comprador (pesos + preferência de pagamento).
 *
 * Chamado pela Server Action updateBuyerRankingPrefsAction.
 * Usa adminClient porque a atualização é feita após o buyerUserId ser validado
 * pelo auth.uid() na Server Action (não precisa de RPC SECURITY DEFINER aqui —
 * a guarda já aconteceu antes de invocar este service).
 *
 * Campos null resetam para o default do sistema (comportamento intencional —
 * o frontend pode enviar null pra "limpar" a configuração).
 *
 * @param buyerUserId - auth.uid() do comprador (validado pela Server Action).
 * @param input       - pesos e/ou preferência de pagamento. Já validados por Zod.
 */
export async function updateBuyerRankingPrefs(
  buyerUserId: string,
  input: UpdateBuyerRankingPrefsInput
): Promise<UpdateBuyerRankingPrefsResult> {
  const admin = createAdminClient();

  // Valida de novo no service (defesa em profundidade).
  const parsed = UpdateBuyerRankingPrefsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados de preferência inválidos." };
  }

  const updatePayload: Record<string, unknown> = {};
  if ("ranking_weights" in parsed.data) {
    updatePayload.ranking_weights = parsed.data.ranking_weights ?? null;
  }
  if ("payment_preference" in parsed.data) {
    updatePayload.payment_preference = parsed.data.payment_preference ?? null;
  }

  if (Object.keys(updatePayload).length === 0) {
    return { ok: true }; // nada a atualizar
  }

  const { error } = await admin
    .from("buyers")
    .update(updatePayload)
    .eq("user_id", buyerUserId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
