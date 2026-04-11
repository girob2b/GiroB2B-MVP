"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apiClient } from "@/lib/api-client";

export type OnboardingState = {
  errors?: Record<string, string[]>;
  message?: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

export async function completeOnboarding(
  _prevState: OnboardingState | undefined,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return { message: "Sessão expirada. Faça login novamente." };

  const segment = formData.get("segment") as string;
  const trade_name = formData.get("trade_name") as string;
  const cnpj = formData.get("cnpj") as string;
  const phone = formData.get("phone") as string;
  const segments_json = formData.get("segments_json") as string;
  const purchase_frequency = formData.get("purchase_frequency") as string;
  const custom_category = formData.get("custom_category") as string;

  try {
    const client = apiClient(session.access_token);
    await client.post("/onboarding/complete", {
      segment,
      trade_name,
      cnpj,
      phone,
      segments_json,
      purchase_frequency,
      custom_category,
    });
  } catch (error) {
    // Se o backend retornou erro de validação (422), ele vem no formato { errors, message }
    const message = errorMessage(error);
    try {
      const parsedError = JSON.parse(message);
      return {
        errors: parsedError.errors,
        message: parsedError.message,
      };
    } catch {
      return { message: message || "Erro ao processar onboarding." };
    }
  }

  revalidatePath("/", "layout");
  redirect("/painel");
}
