import { z } from "zod";
import { OfferPaymentMethod } from "@/lib/schemas/leads";

/**
 * Pesos de ranking configurados pelo comprador.
 *
 * Três fatores numéricos (0–1) que devem somar 1.0 (tolerância ±0.01).
 * Espelha o CHECK constraint de buyers.ranking_weights (migration 052).
 *
 * Fatores:
 *   price    — peso do fator preço (menor = melhor).
 *   deadline — peso do fator prazo de entrega (mais curto = melhor).
 *   distance — peso do fator distância/região (mais próximo = melhor).
 */
export const RankingWeightsSchema = z
  .object({
    price: z
      .number({ error: "Peso de preço deve ser um número." })
      .min(0, "Peso deve ser ≥ 0.")
      .max(1, "Peso deve ser ≤ 1."),
    deadline: z
      .number({ error: "Peso de prazo deve ser um número." })
      .min(0, "Peso deve ser ≥ 0.")
      .max(1, "Peso deve ser ≤ 1."),
    distance: z
      .number({ error: "Peso de distância deve ser um número." })
      .min(0, "Peso deve ser ≥ 0.")
      .max(1, "Peso deve ser ≤ 1."),
  })
  .refine(
    (w) => Math.abs(w.price + w.deadline + w.distance - 1.0) < 0.01,
    { message: "Os pesos devem somar 1.0 (100%)." }
  );

export type RankingWeights = z.infer<typeof RankingWeightsSchema>;

/**
 * Pesos padrão usados quando o comprador não configurou preferência.
 *
 * Lógica: B2B prioriza custo (50%) como fator primário; prazo (30%) é
 * importante mas secundário; proximidade regional (20%) é diferencial.
 */
export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  price: 0.5,
  deadline: 0.3,
  distance: 0.2,
};

/**
 * Input da Server Action de atualização de preferências de ranking do comprador.
 *
 * Ambos os campos são opcionais e nullable:
 *   undefined → campo não enviado → sem atualização (mantém valor atual).
 *   null      → reset explícito → gravado como NULL no banco (usa default do sistema).
 *   value     → atualiza para o valor informado.
 *
 * O banco aceita NULL em ambas as colunas (usa default do sistema quando NULL).
 */
export const UpdateBuyerRankingPrefsSchema = z.object({
  ranking_weights: RankingWeightsSchema.nullable().optional(),
  payment_preference: z
    .array(OfferPaymentMethod)
    .max(6, "Máximo 6 métodos de pagamento.")
    .nullable()
    .optional(),
});

export type UpdateBuyerRankingPrefsInput = z.infer<
  typeof UpdateBuyerRankingPrefsSchema
>;
