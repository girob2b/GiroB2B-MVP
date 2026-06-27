import { z } from "zod";

/**
 * Conjunto canônico de condições de pagamento que o vendedor pode aceitar.
 *
 * Espelha o CHECK constraint de demand_contacts.offer_payment_methods (migration 051).
 * Campo categórico — não entra no score ponderado do comparador (Fase 2);
 * serve como filtro/match: o comprador declara preferência, o vendedor indica o que aceita.
 *
 * Valores:
 *   a_vista     — pagamento à vista (qualquer meio)
 *   pix         — Pix
 *   boleto      — boleto bancário
 *   cartao      — cartão de crédito/débito
 *   parcelado   — parcelamento (crédito)
 *   faturado_30d — faturado com prazo de 30 dias
 */
export const OfferPaymentMethod = z.enum([
  "a_vista",
  "pix",
  "boleto",
  "cartao",
  "parcelado",
  "faturado_30d",
]);
export type OfferPaymentMethod = z.infer<typeof OfferPaymentMethod>;

/**
 * OfferSchema — campos opcionais que o vendedor pode incluir ao enviar uma cotação
 * (Fase 1 do comparador de cotações / proposta híbrida).
 *
 * Todos os campos são opcionais: o vendedor pode preencher nenhum, um ou todos.
 * O backend valida, persiste em demand_contacts e enriquece a mensagem do WhatsApp.
 *
 * price:           em centavos inteiros (evita float). Frontend converte R$ → centavos
 *                  antes de chamar contactDemandAction. Ex: R$150,00 → 15000.
 * deadline:        data ISO YYYY-MM-DD (prazo de entrega prometido pelo vendedor).
 * message:         mensagem personalizada curta (max 300 chars).
 * payment_methods: condições de pagamento aceitas pelo vendedor (array de OfferPaymentMethod).
 *                  Categórico — não vira nota de score; é filtro/match no comparador (Fase 2).
 *                  Adicionado em migration 051 (Fase 1 — enviar cotação).
 */
export const OfferSchema = z
  .object({
    price: z
      .number({ error: "Preço deve ser um número." })
      .int("Preço deve ser um valor inteiro (em centavos).")
      .positive("Preço deve ser maior que zero.")
      .optional(),
    deadline: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida. Use o formato YYYY-MM-DD.")
      .optional(),
    message: z
      .string()
      .trim()
      .max(300, "Mensagem muito longa (máx 300 caracteres).")
      .optional(),
    payment_methods: z
      .array(OfferPaymentMethod)
      .max(6, "Máximo 6 condições de pagamento.")
      .optional(),
  })
  .strict();

export type OfferInput = z.infer<typeof OfferSchema>;
