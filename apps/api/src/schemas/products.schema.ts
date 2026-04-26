import { z } from "zod";

export const CreateProductSchema = z.object({
  name:             z.string().min(2, "Nome é obrigatório"),
  description:      z.string().nullable().optional(),
  category_id:      z.string().uuid().nullable().optional(),
  unit:             z.string().nullable().optional(),
  min_order:        z.number().int().positive().nullable().optional(),
  price_min_cents:  z.number().int().nonnegative().nullable().optional(),
  price_max_cents:  z.number().int().nonnegative().nullable().optional(),
  tags:             z.array(z.string()).nullable().optional(),
  images:           z.array(z.string()).nullable().optional(),
  status:           z.enum(["active", "paused", "draft"]).default("active"),
  visibility:       z.enum(["global", "chat_only"]).default("global"),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
