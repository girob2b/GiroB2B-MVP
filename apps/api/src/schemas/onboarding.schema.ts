import { z } from "zod";

export const CompleteOnboardingSchema = z.object({
  segment: z.enum(["buyer", "supplier", "both"]),
  trade_name:         z.string().min(2).optional(),
  cnpj:               z.string().optional(),
  phone:              z.string().optional(),
  segments_json:      z.string().optional(),
  purchase_frequency: z.string().optional(),
  custom_category:    z.string().optional(),
});

export type CompleteOnboardingInput = z.infer<typeof CompleteOnboardingSchema>;
