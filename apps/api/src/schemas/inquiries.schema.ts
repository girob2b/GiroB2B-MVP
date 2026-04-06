import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .transform(value => value || null)
  .nullable()
  .optional();

export const CreateInquirySchema = z.object({
  supplier_id: z.string().uuid("Fornecedor invalido."),
  product_id: z.string().uuid("Produto invalido.").nullable().optional(),
  description: z
    .string()
    .trim()
    .min(20, "Descreva sua necessidade com pelo menos 20 caracteres.")
    .max(5000, "A descricao deve ter no maximo 5000 caracteres."),
  quantity_estimate: optionalTrimmedString,
  desired_deadline: optionalTrimmedString,
  company_name: optionalTrimmedString,
  cnpj: optionalTrimmedString,
  lgpd_consent: z.literal(true, {
    errorMap: () => ({
      message:
        "Voce precisa autorizar o compartilhamento dos seus dados com fornecedores.",
    }),
  }),
});

export type CreateInquiryInput = z.infer<typeof CreateInquirySchema>;
