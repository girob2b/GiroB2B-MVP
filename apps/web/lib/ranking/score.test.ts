/**
 * Unit tests — scoreOffers (lib/ranking/score.ts)
 *
 * Cobre a matemática determinística do comparador de cotações (Fase 2a).
 * Função pura: sem I/O, sem estado global. today injetável para determinismo.
 *
 * Timezone: TZ=UTC forçado via vitest.config.ts para que
 *   new Date("YYYY-MM-DD") (UTC midnight) e setHours(0,0,0,0) (local midnight)
 *   sejam o mesmo instante — elimina flakiness de fuso horário.
 *
 * Referência de datas usadas nos testes (todas relativas a TODAY = 2026-06-27 UTC):
 *   "2026-06-20" → 7 dias NO PASSADO  (past deadline → 0 days)
 *   "2026-07-04" → 7  dias no futuro
 *   "2026-07-11" → 14 dias no futuro
 *   "2026-07-18" → 21 dias no futuro
 */

import { describe, it, expect } from "vitest";
import {
  scoreOffers,
  type OfferForScoring,
  type DemandForScoring,
} from "./score";
import { RankingWeightsSchema, DEFAULT_RANKING_WEIGHTS } from "@/lib/schemas/comparator";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Data de referência injetada: 2026-06-27 00:00 UTC. */
const TODAY = new Date("2026-06-27T00:00:00Z");

/** Construtor de oferta para testes — apenas os campos relevantes precisam ser informados. */
function makeOffer(params: {
  id: string;
  price?: number | null;
  deadline?: string | null;
  supplierState?: string | null;
  supplierCity?: string | null;
  paymentMethods?: string[] | null;
}): OfferForScoring {
  return {
    contact_id: params.id,
    clicked_at: "2026-06-27T00:00:00Z",
    offer: {
      price_cents: params.price !== undefined ? params.price : null,
      deadline: params.deadline !== undefined ? params.deadline : null,
      message: null,
      payment_methods:
        params.paymentMethods !== undefined ? params.paymentMethods : null,
    },
    supplier: {
      id: `s-${params.id}`,
      trade_name: `Supplier ${params.id}`,
      company_name: null,
      slug: `supplier-${params.id}`,
      city: params.supplierCity !== undefined ? params.supplierCity : null,
      state: params.supplierState !== undefined ? params.supplierState : null,
      is_verified: false,
    },
  };
}

/** Demanda com entrega em São Paulo / SP. */
const DEMAND_SP: DemandForScoring = {
  delivery_city: "São Paulo",
  delivery_state: "SP",
};

/** Demanda sem localização de entrega definida. */
const DEMAND_NULL: DemandForScoring = {
  delivery_city: null,
  delivery_state: null,
};

// ─── scoreOffers ────────────────────────────────────────────────────────────

describe("scoreOffers", () => {
  // ── Input vazio ─────────────────────────────────────────────────────────

  it("retorna array vazio quando não há cotações", () => {
    expect(scoreOffers([], DEMAND_SP, DEFAULT_RANKING_WEIGHTS, [], TODAY)).toEqual([]);
  });

  // ── Fator preço ─────────────────────────────────────────────────────────

  describe("fator preço", () => {
    it("menor preço recebe priceScore 1.0, maior recebe 0.0", () => {
      const offers = [
        makeOffer({ id: "caro", price: 5000 }),
        makeOffer({ id: "barato", price: 1000 }),
      ];
      const w = { price: 1, deadline: 0, distance: 0 };
      const results = scoreOffers(offers, DEMAND_NULL, w, [], TODAY);
      const caro = results.find((r) => r.contact_id === "caro")!;
      const barato = results.find((r) => r.contact_id === "barato")!;
      expect(barato.breakdown.price).toBe(1.0);
      expect(caro.breakdown.price).toBe(0.0);
      expect(barato.score).toBe(1.0);
      expect(caro.score).toBe(0.0);
    });

    it("normaliza 3 preços no range corretamente (1.0, 0.5, 0.0)", () => {
      // priceRange = 5000 - 1000 = 4000
      // barato:   (5000-1000)/4000 = 1.0
      // medio:    (5000-3000)/4000 = 0.5
      // caro:     (5000-5000)/4000 = 0.0
      const offers = [
        makeOffer({ id: "barato", price: 1000 }),
        makeOffer({ id: "medio", price: 3000 }),
        makeOffer({ id: "caro", price: 5000 }),
      ];
      const w = { price: 1, deadline: 0, distance: 0 };
      const results = scoreOffers(offers, DEMAND_NULL, w, [], TODAY);
      const barato = results.find((r) => r.contact_id === "barato")!;
      const medio = results.find((r) => r.contact_id === "medio")!;
      const caro = results.find((r) => r.contact_id === "caro")!;
      expect(barato.breakdown.price).toBe(1.0);
      expect(medio.breakdown.price).toBe(0.5);
      expect(caro.breakdown.price).toBe(0.0);
    });

    it("price_cents null recebe priceScore 0.0", () => {
      const offers = [
        makeOffer({ id: "sem-preco", price: null }),
        makeOffer({ id: "com-preco", price: 1000 }),
      ];
      const w = { price: 1, deadline: 0, distance: 0 };
      const results = scoreOffers(offers, DEMAND_NULL, w, [], TODAY);
      const semPreco = results.find((r) => r.contact_id === "sem-preco")!;
      const comPreco = results.find((r) => r.contact_id === "com-preco")!;
      // Único preço válido → priceRange=0 → priceScore=1.0 para o único priced
      expect(semPreco.breakdown.price).toBe(0.0);
      expect(comPreco.breakdown.price).toBe(1.0);
    });

    it("única cotação com preço recebe priceScore 1.0 (range = 0, sem explosão)", () => {
      const offers = [makeOffer({ id: "only", price: 9999 })];
      const w = { price: 1, deadline: 0, distance: 0 };
      const results = scoreOffers(offers, DEMAND_NULL, w, [], TODAY);
      expect(results).toHaveLength(1);
      expect(results[0].breakdown.price).toBe(1.0);
      expect(results[0].score).toBe(1.0);
      // Nenhum NaN, nenhum Infinity
      expect(Number.isFinite(results[0].score)).toBe(true);
    });

    it("todos os preços iguais → todos recebem priceScore 1.0 (range = 0)", () => {
      const offers = [
        makeOffer({ id: "a", price: 2000 }),
        makeOffer({ id: "b", price: 2000 }),
        makeOffer({ id: "c", price: 2000 }),
      ];
      const w = { price: 1, deadline: 0, distance: 0 };
      const results = scoreOffers(offers, DEMAND_NULL, w, [], TODAY);
      for (const r of results) {
        expect(r.breakdown.price).toBe(1.0);
      }
    });
  });

  // ── Fator prazo ─────────────────────────────────────────────────────────

  describe("fator prazo (deadline)", () => {
    it("prazo mais curto recebe deadlineScore 1.0, mais longo recebe 0.0", () => {
      // short: 2026-07-04 = 7 dias; long: 2026-07-18 = 21 dias (com TZ=UTC)
      const offers = [
        makeOffer({ id: "longo", deadline: "2026-07-18" }),
        makeOffer({ id: "curto", deadline: "2026-07-04" }),
      ];
      const w = { price: 0, deadline: 1, distance: 0 };
      const results = scoreOffers(offers, DEMAND_NULL, w, [], TODAY);
      const curto = results.find((r) => r.contact_id === "curto")!;
      const longo = results.find((r) => r.contact_id === "longo")!;
      expect(curto.breakdown.deadline).toBe(1.0);
      expect(longo.breakdown.deadline).toBe(0.0);
    });

    it("prazo null recebe deadlineScore 0.0", () => {
      const offers = [
        makeOffer({ id: "sem-prazo", deadline: null }),
        makeOffer({ id: "com-prazo", deadline: "2026-07-04" }),
      ];
      const w = { price: 0, deadline: 1, distance: 0 };
      const results = scoreOffers(offers, DEMAND_NULL, w, [], TODAY);
      const semPrazo = results.find((r) => r.contact_id === "sem-prazo")!;
      const comPrazo = results.find((r) => r.contact_id === "com-prazo")!;
      expect(semPrazo.breakdown.deadline).toBe(0.0);
      // Único prazo válido → dayRange=0 → deadlineScore=1.0
      expect(comPrazo.breakdown.deadline).toBe(1.0);
    });

    it("prazo passado é convertido para 0 dias (entrega imediata → melhor score)", () => {
      // "2026-06-20" é 7 dias antes de TODAY (2026-06-27)
      // diffMs < 0 → Math.max(0, ...) = 0 dias (melhor caso)
      const offers = [
        makeOffer({ id: "passado", deadline: "2026-06-20" }),
        makeOffer({ id: "futuro", deadline: "2026-07-04" }), // 7 dias
      ];
      const w = { price: 0, deadline: 1, distance: 0 };
      const results = scoreOffers(offers, DEMAND_NULL, w, [], TODAY);
      const passado = results.find((r) => r.contact_id === "passado")!;
      const futuro = results.find((r) => r.contact_id === "futuro")!;
      // passado = 0 dias (imediato = melhor), futuro = 7 dias (pior)
      // dayRange = 7-0 = 7; passado: (7-0)/7 = 1.0; futuro: (7-7)/7 = 0.0
      expect(passado.breakdown.deadline).toBe(1.0);
      expect(futuro.breakdown.deadline).toBe(0.0);
    });

    it("única cotação com prazo recebe deadlineScore 1.0 (range = 0, sem explosão)", () => {
      const offers = [makeOffer({ id: "only", deadline: "2026-07-04" })];
      const w = { price: 0, deadline: 1, distance: 0 };
      const results = scoreOffers(offers, DEMAND_NULL, w, [], TODAY);
      expect(results[0].breakdown.deadline).toBe(1.0);
      expect(Number.isFinite(results[0].score)).toBe(true);
    });
  });

  // ── Fator distância ──────────────────────────────────────────────────────

  describe("fator distância", () => {
    it("mesma cidade e estado → distanceScore 1.0", () => {
      const offers = [
        makeOffer({ id: "a", supplierCity: "São Paulo", supplierState: "SP" }),
      ];
      const results = scoreOffers(offers, DEMAND_SP, DEFAULT_RANKING_WEIGHTS, [], TODAY);
      expect(results[0].breakdown.distance).toBe(1.0);
    });

    it("mesmo estado, cidade diferente → distanceScore 0.5", () => {
      const offers = [
        makeOffer({ id: "a", supplierCity: "Campinas", supplierState: "SP" }),
      ];
      const results = scoreOffers(offers, DEMAND_SP, DEFAULT_RANKING_WEIGHTS, [], TODAY);
      expect(results[0].breakdown.distance).toBe(0.5);
    });

    it("mesmo estado, cidade do supplier null → distanceScore 0.5", () => {
      const offers = [
        makeOffer({ id: "a", supplierCity: null, supplierState: "SP" }),
      ];
      const results = scoreOffers(offers, DEMAND_SP, DEFAULT_RANKING_WEIGHTS, [], TODAY);
      expect(results[0].breakdown.distance).toBe(0.5);
    });

    it("estado diferente → distanceScore 0.0", () => {
      const offers = [
        makeOffer({ id: "a", supplierCity: "Rio de Janeiro", supplierState: "RJ" }),
      ];
      const results = scoreOffers(offers, DEMAND_SP, DEFAULT_RANKING_WEIGHTS, [], TODAY);
      expect(results[0].breakdown.distance).toBe(0.0);
    });

    it("supplier sem estado → distanceScore 0.0", () => {
      const offers = [makeOffer({ id: "a", supplierState: null })];
      const results = scoreOffers(offers, DEMAND_SP, DEFAULT_RANKING_WEIGHTS, [], TODAY);
      expect(results[0].breakdown.distance).toBe(0.0);
    });

    it("delivery_state null → distanceScore 0.5 para TODAS as ofertas (neutro)", () => {
      const offers = [
        makeOffer({ id: "a", supplierCity: "São Paulo", supplierState: "SP" }),
        makeOffer({ id: "b", supplierState: null }),
        makeOffer({ id: "c", supplierCity: "Rio de Janeiro", supplierState: "RJ" }),
      ];
      const results = scoreOffers(offers, DEMAND_NULL, DEFAULT_RANKING_WEIGHTS, [], TODAY);
      for (const r of results) {
        expect(r.breakdown.distance).toBe(0.5);
      }
    });

    it("comparação de estado e cidade é case-insensitive", () => {
      const offers = [
        makeOffer({ id: "a", supplierCity: "são paulo", supplierState: "sp" }),
      ];
      const demand: DemandForScoring = {
        delivery_city: "São Paulo",
        delivery_state: "SP",
      };
      const results = scoreOffers(offers, demand, DEFAULT_RANKING_WEIGHTS, [], TODAY);
      expect(results[0].breakdown.distance).toBe(1.0);
    });

    it("comparação ignora espaços extras ao redor (trim)", () => {
      const offers = [
        makeOffer({ id: "a", supplierCity: "  São Paulo  ", supplierState: " SP " }),
      ];
      const results = scoreOffers(offers, DEMAND_SP, DEFAULT_RANKING_WEIGHTS, [], TODAY);
      expect(results[0].breakdown.distance).toBe(1.0);
    });
  });

  // ── Pesos ────────────────────────────────────────────────────────────────

  describe("pesos de ranking", () => {
    it("pesos customizados: distance=1 → só distância conta no score", () => {
      const offers = [
        makeOffer({
          id: "mesma-cidade",
          price: 99999,
          deadline: "2026-12-31",
          supplierCity: "São Paulo",
          supplierState: "SP",
        }),
        makeOffer({
          id: "outro-estado",
          price: 1,
          deadline: "2026-06-28",
          supplierCity: "Recife",
          supplierState: "PE",
        }),
      ];
      const w = { price: 0, deadline: 0, distance: 1 };
      const results = scoreOffers(offers, DEMAND_SP, w, [], TODAY);
      const mesma = results.find((r) => r.contact_id === "mesma-cidade")!;
      const outro = results.find((r) => r.contact_id === "outro-estado")!;
      expect(mesma.score).toBe(1.0);
      expect(outro.score).toBe(0.0);
    });

    it("soma ponderada correta com 3 fatores em cenário intermediário", () => {
      // Preços: 1000, 3000, 5000 → priceRange=4000
      // Deadlines: 7, 14, 21 dias → dayRange=14
      // Distâncias: mesma cidade (1.0), mesmo estado (0.5), outro estado (0.0)
      // Pesos default: price=0.5, deadline=0.3, distance=0.2
      const offers = [
        makeOffer({
          id: "a",
          price: 1000,
          deadline: "2026-07-04",
          supplierCity: "São Paulo",
          supplierState: "SP",
        }),
        makeOffer({
          id: "b",
          price: 3000,
          deadline: "2026-07-11",
          supplierCity: "Campinas",
          supplierState: "SP",
        }),
        makeOffer({
          id: "c",
          price: 5000,
          deadline: "2026-07-18",
          supplierCity: "Rio de Janeiro",
          supplierState: "RJ",
        }),
      ];
      const results = scoreOffers(offers, DEMAND_SP, DEFAULT_RANKING_WEIGHTS, [], TODAY);
      const a = results.find((r) => r.contact_id === "a")!;
      const b = results.find((r) => r.contact_id === "b")!;
      const c = results.find((r) => r.contact_id === "c")!;

      // Oferta A: priceScore=1.0, deadlineScore=1.0, distanceScore=1.0
      // score = 0.5*1.0 + 0.3*1.0 + 0.2*1.0 = 1.0
      expect(a.breakdown.price).toBe(1.0);
      expect(a.breakdown.deadline).toBe(1.0);
      expect(a.breakdown.distance).toBe(1.0);
      expect(a.score).toBe(1.0);

      // Oferta B: priceScore=0.5, deadlineScore=0.5, distanceScore=0.5
      // score = 0.5*0.5 + 0.3*0.5 + 0.2*0.5 = 0.25+0.15+0.10 = 0.5
      expect(b.breakdown.price).toBe(0.5);
      expect(b.breakdown.deadline).toBe(0.5);
      expect(b.breakdown.distance).toBe(0.5);
      expect(b.score).toBe(0.5);

      // Oferta C: tudo 0.0
      expect(c.breakdown.price).toBe(0.0);
      expect(c.breakdown.deadline).toBe(0.0);
      expect(c.breakdown.distance).toBe(0.0);
      expect(c.score).toBe(0.0);
    });

    it("DEFAULT_RANKING_WEIGHTS tem values corretos (price=0.5, deadline=0.3, distance=0.2)", () => {
      expect(DEFAULT_RANKING_WEIGHTS.price).toBe(0.5);
      expect(DEFAULT_RANKING_WEIGHTS.deadline).toBe(0.3);
      expect(DEFAULT_RANKING_WEIGHTS.distance).toBe(0.2);
      // Verificação extra: somam 1.0
      const soma =
        DEFAULT_RANKING_WEIGHTS.price +
        DEFAULT_RANKING_WEIGHTS.deadline +
        DEFAULT_RANKING_WEIGHTS.distance;
      expect(soma).toBeCloseTo(1.0, 5);
    });
  });

  // ── payment_match ────────────────────────────────────────────────────────

  describe("payment_match", () => {
    it("payment_match é true quando paymentPreference está vazia (tudo casa)", () => {
      const offers = [
        makeOffer({ id: "a", paymentMethods: null }),
        makeOffer({ id: "b", paymentMethods: ["pix", "cartao"] }),
      ];
      const results = scoreOffers(offers, DEMAND_NULL, DEFAULT_RANKING_WEIGHTS, [], TODAY);
      for (const r of results) {
        expect(r.payment_match).toBe(true);
      }
    });

    it("payment_match é true quando métodos da oferta intersectam com preferência", () => {
      const offers = [makeOffer({ id: "a", paymentMethods: ["pix", "boleto"] })];
      const results = scoreOffers(offers, DEMAND_NULL, DEFAULT_RANKING_WEIGHTS, ["pix"], TODAY);
      expect(results[0].payment_match).toBe(true);
    });

    it("payment_match é false quando não há interseção entre oferta e preferência", () => {
      const offers = [makeOffer({ id: "a", paymentMethods: ["cartao", "boleto"] })];
      const results = scoreOffers(offers, DEMAND_NULL, DEFAULT_RANKING_WEIGHTS, ["pix"], TODAY);
      expect(results[0].payment_match).toBe(false);
    });

    it("payment_match é false quando payment_methods é null e há preferência declarada", () => {
      const offers = [makeOffer({ id: "a", paymentMethods: null })];
      const results = scoreOffers(offers, DEMAND_NULL, DEFAULT_RANKING_WEIGHTS, ["pix"], TODAY);
      expect(results[0].payment_match).toBe(false);
    });

    it("payment_match é false quando array de métodos está vazio e há preferência", () => {
      const offers = [makeOffer({ id: "a", paymentMethods: [] })];
      const results = scoreOffers(offers, DEMAND_NULL, DEFAULT_RANKING_WEIGHTS, ["pix"], TODAY);
      expect(results[0].payment_match).toBe(false);
    });

    it("payment_match não afeta o score ponderado", () => {
      // Dois suppliers idênticos em tudo, diferindo só em payment_match
      const offers = [
        makeOffer({ id: "match", price: 1000, paymentMethods: ["pix"] }),
        makeOffer({ id: "no-match", price: 1000, paymentMethods: ["cartao"] }),
      ];
      const w = { price: 1, deadline: 0, distance: 0 };
      const results = scoreOffers(offers, DEMAND_NULL, w, ["pix"], TODAY);
      const match = results.find((r) => r.contact_id === "match")!;
      const noMatch = results.find((r) => r.contact_id === "no-match")!;
      // Scores idênticos (payment_match não entra no score ponderado)
      expect(match.score).toBe(noMatch.score);
      // Mas payment_match difere
      expect(match.payment_match).toBe(true);
      expect(noMatch.payment_match).toBe(false);
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("todos os fatores null → score 0", () => {
      const offers = [
        makeOffer({ id: "a", price: null, deadline: null, supplierState: null }),
      ];
      const results = scoreOffers(offers, DEMAND_SP, DEFAULT_RANKING_WEIGHTS, [], TODAY);
      expect(results[0].breakdown.price).toBe(0);
      expect(results[0].breakdown.deadline).toBe(0);
      expect(results[0].breakdown.distance).toBe(0);
      expect(results[0].score).toBe(0);
      expect(Number.isFinite(results[0].score)).toBe(true);
    });

    it("ordena resultados de forma decrescente por score", () => {
      const offers = [
        makeOffer({ id: "caro", price: 5000 }),
        makeOffer({ id: "medio", price: 3000 }),
        makeOffer({ id: "barato", price: 1000 }),
      ];
      const w = { price: 1, deadline: 0, distance: 0 };
      const results = scoreOffers(offers, DEMAND_NULL, w, [], TODAY);
      expect(results[0].contact_id).toBe("barato");
      expect(results[1].contact_id).toBe("medio");
      expect(results[2].contact_id).toBe("caro");
      // Scores estritamente decrescentes
      expect(results[0].score).toBeGreaterThan(results[1].score);
      expect(results[1].score).toBeGreaterThan(results[2].score);
    });

    it("empates no score: ambas as ofertas aparecem no resultado", () => {
      // Dois suppliers idênticos → scores iguais
      const offers = [
        makeOffer({ id: "a", price: 2000, supplierState: "SP", supplierCity: "Campinas" }),
        makeOffer({ id: "b", price: 2000, supplierState: "SP", supplierCity: "Campinas" }),
      ];
      const results = scoreOffers(offers, DEMAND_SP, DEFAULT_RANKING_WEIGHTS, [], TODAY);
      expect(results).toHaveLength(2);
      expect(results[0].score).toBe(results[1].score);
    });

    it("score arredondado em 4 casas decimais (sem ruído de float)", () => {
      // 3000 entre 1000 e 5000: priceScore = (5000-3000)/4000 = 0.5
      // 0.5 * 1.0 = 0.5 → sem ruído neste caso
      const offers = [
        makeOffer({ id: "a", price: 1000 }),
        makeOffer({ id: "b", price: 3000 }),
        makeOffer({ id: "c", price: 5000 }),
      ];
      const w = { price: 1, deadline: 0, distance: 0 };
      const results = scoreOffers(offers, DEMAND_NULL, w, [], TODAY);
      for (const r of results) {
        // Score deve ter no máximo 4 casas decimais
        const str = r.score.toString();
        const decimals = str.includes(".") ? str.split(".")[1].length : 0;
        expect(decimals).toBeLessThanOrEqual(4);
      }
    });

    it("campos de metadados (contact_id, clicked_at, supplier, offer) são passados corretamente", () => {
      const offers = [
        {
          contact_id: "uuid-abc",
          clicked_at: "2026-06-27T12:00:00Z",
          offer: {
            price_cents: 1000,
            deadline: null,
            message: "Entrego rápido",
            payment_methods: ["pix"],
          },
          supplier: {
            id: "sup-xyz",
            trade_name: "Fornecedor Teste",
            company_name: "Teste Ltda",
            slug: "fornecedor-teste",
            city: "São Paulo",
            state: "SP",
            is_verified: true,
          },
        },
      ];
      const results = scoreOffers(offers, DEMAND_SP, DEFAULT_RANKING_WEIGHTS, [], TODAY);
      expect(results[0].contact_id).toBe("uuid-abc");
      expect(results[0].clicked_at).toBe("2026-06-27T12:00:00Z");
      expect(results[0].supplier.id).toBe("sup-xyz");
      expect(results[0].supplier.is_verified).toBe(true);
      expect(results[0].offer.message).toBe("Entrego rápido");
    });
  });
});

// ─── RankingWeightsSchema ─────────────────────────────────────────────────────

describe("RankingWeightsSchema", () => {
  it("aceita pesos válidos somando 1.0 (default weights)", () => {
    const result = RankingWeightsSchema.safeParse({
      price: 0.5,
      deadline: 0.3,
      distance: 0.2,
    });
    expect(result.success).toBe(true);
  });

  it("aceita pesos onde apenas um fator vale tudo", () => {
    expect(
      RankingWeightsSchema.safeParse({ price: 1, deadline: 0, distance: 0 }).success
    ).toBe(true);
    expect(
      RankingWeightsSchema.safeParse({ price: 0, deadline: 1, distance: 0 }).success
    ).toBe(true);
    expect(
      RankingWeightsSchema.safeParse({ price: 0, deadline: 0, distance: 1 }).success
    ).toBe(true);
  });

  it("aceita pesos somando 1.0 dentro da tolerância de ±0.01", () => {
    // 0.333 + 0.333 + 0.334 = 1.0 exato
    expect(
      RankingWeightsSchema.safeParse({ price: 0.333, deadline: 0.333, distance: 0.334 }).success
    ).toBe(true);
  });

  it("rejeita pesos cuja soma excede 1.0 + tolerância", () => {
    // 0.5 + 0.3 + 0.3 = 1.1, |1.1 - 1.0| = 0.1 ≥ 0.01
    const result = RankingWeightsSchema.safeParse({
      price: 0.5,
      deadline: 0.3,
      distance: 0.3,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita pesos cuja soma é menor que 1.0 - tolerância", () => {
    // 0.3 + 0.3 + 0.3 = 0.9, |0.9 - 1.0| = 0.1 ≥ 0.01
    const result = RankingWeightsSchema.safeParse({
      price: 0.3,
      deadline: 0.3,
      distance: 0.3,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita peso negativo", () => {
    const result = RankingWeightsSchema.safeParse({
      price: -0.1,
      deadline: 0.6,
      distance: 0.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita peso maior que 1", () => {
    const result = RankingWeightsSchema.safeParse({
      price: 1.2,
      deadline: 0,
      distance: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita valores não-numéricos", () => {
    const result = RankingWeightsSchema.safeParse({
      price: "alto",
      deadline: 0.3,
      distance: 0.2,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita campos ausentes", () => {
    const result = RankingWeightsSchema.safeParse({
      price: 0.5,
      deadline: 0.5,
      // distance ausente
    });
    expect(result.success).toBe(false);
  });
});
