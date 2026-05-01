import { z } from "zod";

export const CreateInquirySchema = z.object({
  supplier_id: z.string().uuid("Fornecedor invalido."),
  product_id: z.string().uuid("Produto invalido.").nullable().optional(),
  description: z
    .string()
    .trim()
    .min(20, "Descreva sua necessidade com pelo menos 20 caracteres.")
    .max(5000, "A descricao deve ter no maximo 5000 caracteres."),
  quantity_estimate: z.string().trim().max(200, "Texto muito longo.").transform(value => value || null).nullable().optional(),
  desired_deadline: z.string().trim().max(200, "Texto muito longo.").transform(value => value || null).nullable().optional(),
  company_name: z.string().trim().max(200, "Nome muito longo.").transform(value => value || null).nullable().optional(),
  cnpj: z.string().trim().max(18, "CNPJ inválido.").transform(value => value || null).nullable().optional(),
  lgpd_consent: z.literal(true),
});

export type CreateInquiryInput = z.infer<typeof CreateInquirySchema>;
