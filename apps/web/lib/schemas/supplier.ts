import { z } from "zod";

export const UpgradeSupplierSchema = z.object({
  trade_name: z.string().min(2).max(200),
  cnpj: z.string().min(14).max(18),
  phone: z.string().min(8).max(30),
  company_name: z.string().min(2).max(200).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().length(2).optional(),
  segments_json: z.string().max(5000).optional(),
  custom_category: z.string().max(200).optional(),
});

export const UpdateProfileSchema = z.object({
  description: z.string().max(5000, "Descrição muito longa.").nullable().optional(),
  logo_url: z.string().url().max(2000).nullable().optional(),
  phone: z.string().max(30).optional(),
  whatsapp: z.string().max(30).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  website: z.string().url().max(2000).nullable().optional(),
  instagram: z.string().max(200).nullable().optional(),
  linkedin: z.string().max(200).nullable().optional(),
  founded_year: z.number().int().min(1800).nullable().optional(),
  employee_count: z.enum(["1-5", "6-10", "11-50", "51-200", "201-500", "500+"]).nullable().optional(),
  operating_hours: z.string().max(500).nullable().optional(),
  categories: z.array(z.string().uuid()).max(20).optional(),
  photos: z.array(z.string().url().max(2000)).max(10).optional(),
  public_profile_layout: z
    .array(
      z.object({
        key: z.enum(["hero", "about", "gallery", "products", "contact"]),
        enabled: z.boolean().optional(),
      })
    )
    .nullable()
    .optional(),
});

export const UpdateSettingsSchema = z.object({
  phone:               z.string().max(30).optional(),
  whatsapp:            z.string().max(30).nullable().optional(),
  address:             z.string().max(500).nullable().optional(),
  cep:                 z.string().max(20).nullable().optional(),
  city:                z.string().max(100).optional(),
  state:               z.string().length(2).optional(),
  inscricao_municipal: z.string().max(50).nullable().optional(),
  inscricao_estadual:  z.string().max(50).nullable().optional(),
  situacao_fiscal:     z.enum([
    "simples_nacional", "mei", "lucro_presumido", "lucro_real",
    "lucro_arbitrado", "imune", "isento", "outros",
  ]).nullable().optional(),
  allow_relisting:     z.boolean().optional(),
});

export type UpgradeSupplierInput = z.infer<typeof UpgradeSupplierSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
