import { z } from "zod";

export const CreateProductSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório").max(200, "Nome muito longo."),
  description: z.string().max(5000, "Descrição muito longa.").nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  min_order: z.number().int().positive().nullable().optional(),
  price_min_cents: z.number().int().nonnegative().nullable().optional(),
  price_max_cents: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string().max(60)).max(20).nullable().optional(),
  images: z.array(z.string().url().max(2000)).max(10).nullable().optional(),
  status: z.enum(["active", "paused", "draft"]).default("active"),
  visibility: z.enum(["global", "chat_only"]).default("global"),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const ImportProductBodySchema = z.object({
  original_product_id: z.string().uuid(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ImportProductInput = z.infer<typeof ImportProductBodySchema>;
