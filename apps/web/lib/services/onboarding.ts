import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createSupplierUpgrade } from "@/lib/services/supplier";
import { syncDerivedUserRoleWithAdmin } from "@/lib/services/user-role";
import type { CompleteOnboardingInput } from "@/lib/schemas/onboarding";

type OnboardingResult =
  | { success: true }
  | { message: string }
  | { errors: Record<string, string[]> };

type UserMetadata = {
  full_name?: string;
  phone?: string;
  city?: string;
  state?: string;
};

export async function completeOnboardingForUser(
  userId: string,
  userEmail: string,
  input: CompleteOnboardingInput
): Promise<OnboardingResult> {
  const admin = createAdminClient();
  const segment = input.segment ?? "buyer";

  const userResult = await admin.auth.admin.getUserById(userId);
  if (userResult.error) {
    return { message: "Nao foi possivel carregar os dados da conta." };
  }

  const userMetadata = (userResult.data.user?.user_metadata ?? {}) as UserMetadata;
  const fullName = userMetadata.full_name?.trim() || userEmail.split("@")[0];
  const basePhone = userMetadata.phone?.trim() || null;
  const baseCity = userMetadata.city?.trim() || null;
  const baseState = userMetadata.state?.trim() || null;

  if (segment === "buyer" || segment === "both") {
    const { error } = await admin.from("buyers").upsert({
      user_id: userId,
      email: userEmail,
      name: fullName,
      phone: basePhone,
      city: baseCity,
      state: baseState,
      purchase_frequency: input.purchase_frequency ?? null,
      lgpd_consent: true,
      lgpd_consent_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) {
      console.error("[onboarding] buyers.upsert failed:", error);
      return { message: `Erro ao salvar dados do comprador: ${error.message}` };
    }
  }

  if (segment === "supplier" || segment === "both") {
    if (!input.trade_name || !input.cnpj || !input.phone) {
      return { errors: { general: ["Dados do fornecedor incompletos."] } };
    }

    const supplierResult = await createSupplierUpgrade(userId, {
      trade_name: input.trade_name,
      company_name: input.company_name,
      cnpj: input.cnpj,
      phone: input.phone,
      city: input.city,
      state: input.state,
      segments_json: input.segments_json,
      custom_category: input.custom_category,
    });

    if (!("success" in supplierResult)) return supplierResult;
  }

  const metadataUpdate = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...userMetadata,
      onboarding_complete: true,
    },
  });

  if (metadataUpdate.error) {
    return { message: "Os dados foram salvos, mas nao foi possivel finalizar o onboarding da conta." };
  }

  await syncDerivedUserRoleWithAdmin(admin, userId);
  return { success: true };
}
