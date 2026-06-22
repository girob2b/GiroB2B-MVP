import { z } from "zod";

/**
 * OfferSchema — campos opcionais que o vendedor pode incluir ao contatar
 * um comprador via WhatsApp (proposta híbrida, Bloco 4 Headline).
 *
 * Todos os campos são opcionais: o vendedor pode preencher nenhum, um ou todos.
 * O backend valida, persiste em demand_contacts e enriquece a mensagem do WhatsApp.
 *
 * price: em centavos inteiros (evita float). Frontend converte R$ → centavos
 *        antes de chamar contactDemandAction. Ex: R$150,00 → 15000.
 * deadline: data ISO YYYY-MM-DD (prazo de entrega da oferta do vendedor).
 * message: mensagem personalizada curta (max 300 chars).
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
  })
  .strict();

export type OfferInput = z.infer<typeof OfferSchema>;
