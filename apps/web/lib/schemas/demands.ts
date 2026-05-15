import { z } from "zod";

// Versão do texto LGPD exibido. Trocar quando o texto mudar — gravado em
// demands.lgpd_consent_text_version pra evidência forense.
export const LGPD_CONSENT_TEXT_VERSION = "demand-publish-v1-2026-05-07";

export const DEMAND_STATUSES = ["open", "negotiating", "fulfilled", "cancelled", "expired"] as const;
export type DemandStatus = (typeof DEMAND_STATUSES)[number];

export const DEMAND_KINDS = ["simple", "structured"] as const;
export type DemandKind = (typeof DEMAND_KINDS)[number];

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

// ─── Item da proposta estruturada ───────────────────────────────────────────
export const DemandItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(3, "Descrição do item muito curta.")
    .max(300, "Descrição do item muito longa."),
  quantity: z.number().positive("Quantidade deve ser positiva."),
  unit: z.string().trim().min(1, "Informe a unidade.").max(20),
  specs: z.string().trim().max(1000).nullable().optional(),
});
export type DemandItem = z.infer<typeof DemandItemSchema>;

// ─── Schema do guest (publicação sem cadastro) ──────────────────────────────
// Visitante anônimo pode publicar 1 demand fornecendo nome+email+whatsapp.
// Limite "1 por email guest" é validado no Server Action contra o banco.
export const GuestDemandSchema = z.object({
  guest_name: z.string().trim().min(2, "Informe seu nome.").max(120),
  guest_email: z.string().trim().toLowerCase().email("Email inválido."),
  guest_whatsapp: z
    .string()
    .trim()
    .regex(/^\+?\d{10,14}$/, "WhatsApp inválido. Use apenas números com DDD.")
    .transform((v) => v.replace(/^\+/, "")),
});
export type GuestDemandInput = z.infer<typeof GuestDemandSchema>;

// ─── Base comum ─────────────────────────────────────────────────────────────
const BaseDemandSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Título muito curto.")
    .max(120, "Título muito longo (máx 120)."),
  // Descrição opcional (decisão de produto 2026-05-14): proposta simples não
  // exige descrição rica — título + foto + preço/condições já trazem contexto.
  description: z
    .string()
    .trim()
    .max(5000, "Descrição muito longa (máx 5000).")
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
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

// attachment_url armazena APENAS o object_path no bucket demand-attachments,
// no formato `{uuid}/{filename.pdf}`. Não é URL completa — restrição garante
// que a policy de leitura (igualdade exata com storage.objects.name) só case
// com objetos do bucket esperado. Bypass via URL externa + sufixo é bloqueado.
const ATTACHMENT_PATH_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]+\.pdf$/i;
export const AttachmentPathSchema = z
  .string()
  .trim()
  .regex(ATTACHMENT_PATH_REGEX, "Anexo inválido — re-envie o PDF.")
  .max(255);

// ─── Discriminated union por kind ───────────────────────────────────────────
export const CreateDemandSchema = z.discriminatedUnion("kind", [
  BaseDemandSchema.extend({
    kind: z.literal("simple"),
    items: z.null().optional(),
    payment_terms: z.null().optional(),
    delivery_terms: z.null().optional(),
    required_docs: z.null().optional(),
    attachment_url: z.null().optional(),
  }),
  BaseDemandSchema.extend({
    kind: z.literal("structured"),
    items: z
      .array(DemandItemSchema)
      .min(1, "Adicione pelo menos 1 item.")
      .max(50, "Limite de 50 itens por proposta."),
    payment_terms: z.string().trim().max(500).nullable().optional(),
    delivery_terms: z.string().trim().max(500).nullable().optional(),
    required_docs: z.string().trim().max(1000).nullable().optional(),
    attachment_url: AttachmentPathSchema.nullable().optional(),
  }),
]);

export type CreateDemandInput = z.infer<typeof CreateDemandSchema>;

// Update — kind é imutável após publicação (decisão de produto 2026-05-14:
// evita perda de dados ao alternar simple↔structured numa demand já viva).
// Schema parcial sem kind; quem precisar mudar kind exclui e republica.
export const UpdateDemandSchema = BaseDemandSchema.partial().extend({
  status: z.enum(DEMAND_STATUSES).optional(),
  items: z.array(DemandItemSchema).min(1).max(50).nullable().optional(),
  payment_terms: z.string().trim().max(500).nullable().optional(),
  delivery_terms: z.string().trim().max(500).nullable().optional(),
  required_docs: z.string().trim().max(1000).nullable().optional(),
  attachment_url: AttachmentPathSchema.nullable().optional(),
});

export type UpdateDemandInput = z.infer<typeof UpdateDemandSchema>;
