import { z } from "zod";

export const UpdateProfileSchema = z.object({
  description:     z.string().nullable().optional(),
  logo_url:        z.string().url().nullable().optional(),
  phone:           z.string().optional(),
  whatsapp:        z.string().nullable().optional(),
  address:         z.string().nullable().optional(),
  website:         z.string().url().nullable().optional(),
  instagram:       z.string().nullable().optional(),
  linkedin:        z.string().nullable().optional(),
  founded_year:    z.number().int().min(1800).nullable().optional(),
  employee_count:  z.enum(["1-5","6-10","11-50","51-200","201-500","500+"]).nullable().optional(),
  operating_hours: z.string().nullable().optional(),
  categories:      z.array(z.string().uuid()).optional(),
  photos:          z.array(z.string()).optional(),
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
  phone:               z.string().optional(),
  whatsapp:            z.string().nullable().optional(),
  address:             z.string().nullable().optional(),
  cep:                 z.string().nullable().optional(),
  city:                z.string().optional(),
  state:               z.string().length(2).optional(),
  inscricao_municipal: z.string().nullable().optional(),
  inscricao_estadual:  z.string().nullable().optional(),
  situacao_fiscal:     z.enum([
    "simples_nacional","mei","lucro_presumido","lucro_real",
    "lucro_arbitrado","imune","isento","outros",
  ]).nullable().optional(),
});

export type UpdateProfileInput   = z.infer<typeof UpdateProfileSchema>;
export type UpdateSettingsInput  = z.infer<typeof UpdateSettingsSchema>;
