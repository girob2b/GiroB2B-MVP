import { z } from "zod";

export const CompleteOnboardingSchema = z.object({
  segment: z.enum(["buyer", "supplier", "both"]).optional(),
  trade_name: z.string().min(2).optional(),
  company_name: z.string().min(2).optional(),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().min(2).optional(),
  state: z.string().length(2).optional(),
  segments_json: z.string().optional(),
  purchase_frequency: z.string().optional(),
  custom_category: z.string().optional(),
});

export type CompleteOnboardingInput = z.infer<typeof CompleteOnboardingSchema>;
