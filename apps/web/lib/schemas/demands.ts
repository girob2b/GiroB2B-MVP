import { z } from "zod";

// Versão do texto LGPD exibido. Trocar quando o texto mudar — gravado em
// demands.lgpd_consent_text_version pra evidência forense.
export const LGPD_CONSENT_TEXT_VERSION = "demand-publish-v1-2026-05-07";

export const DEMAND_STATUSES = ["open", "negotiating", "fulfilled", "cancelled", "expired"] as const;
export type DemandStatus = (typeof DEMAND_STATUSES)[number];

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
] as const;

const whatsapp = z
  .string()
  .trim()
  .regex(/^\+?\d{10,14}$/, "WhatsApp inválido. Use apenas números, DDD obrigatório.")
  .transform((v) => v.replace(/^\+/, ""));

export const CreateDemandSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Título muito curto.")
    .max(120, "Título muito longo (máx 120)."),
  description: z
    .string()
    .trim()
    .min(20, "Descreva sua necessidade com pelo menos 20 caracteres.")
    .max(5000, "Descrição muito longa (máx 5000)."),
  category_id: z.string().uuid("Selecione uma categoria.").nullable().optional(),
  subcategory_slug: z.string().trim().max(80).nullable().optional(),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().trim().max(40).nullable().optional(),
  budget_max_cents: z.number().int().positive().nullable().optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use YYYY-MM-DD).")
    .nullable()
    .optional(),
  delivery_city: z.string().trim().max(120).nullable().optional(),
  delivery_state: z.enum(BR_STATES, { message: "UF inválida." }).nullable().optional(),
  whatsapp_number: whatsapp,
  photos_urls: z.array(z.string().url()).max(3).optional().default([]),
  lgpd_consent: z.literal(true, {
    message: "Você precisa aceitar a Política de Privacidade e os Termos de Uso.",
  }),
});

export type CreateDemandInput = z.infer<typeof CreateDemandSchema>;

export const UpdateDemandSchema = CreateDemandSchema.partial().extend({
  status: z.enum(DEMAND_STATUSES).optional(),
});

export type UpdateDemandInput = z.infer<typeof UpdateDemandSchema>;
