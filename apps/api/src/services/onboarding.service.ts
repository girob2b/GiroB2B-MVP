import { createAdminClient } from "../lib/supabase.js";
import { syncDerivedUserRoleWithAdmin } from "../lib/user-role.js";
import type { CompleteOnboardingInput } from "../schemas/onboarding.schema.js";
import { createSupplierUpgrade } from "./supplier.service.js";

interface UserMetadata {
  full_name?: string;
  phone?: string;
  city?: string;
  state?: string;
}

export async function completeOnboarding(
  userId: string,
  userEmail: string,
  input: CompleteOnboardingInput
) {
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
    const { error: buyerError } = await admin.from("buyers").upsert({
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

    if (buyerError) {
      console.error("[onboarding] buyers.upsert failed:", buyerError);
      return { message: `Erro ao salvar dados do comprador: ${buyerError.message}` };
    }
  }

  if (segment === "supplier" || segment === "both") {
    if (!input.trade_name || !input.cnpj || !input.phone) {
      return { errors: { general: ["Dados do fornecedor incompletos."] } };
    }

    const supplierResult = await createSupplierUpgrade(userId, userEmail, {
      trade_name: input.trade_name,
      cnpj: input.cnpj,
      phone: input.phone,
      segments_json: input.segments_json,
      custom_category: input.custom_category,
    });

    if (!("success" in supplierResult)) {
      return supplierResult;
    }
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
