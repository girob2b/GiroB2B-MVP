import { createAdminClient } from "../lib/supabase.js";
import { cleanCNPJ } from "../lib/brasilapi.js";
import { supplierSlug } from "../lib/slug.js";
import type { CompleteOnboardingInput } from "../schemas/onboarding.schema.js";

export async function completeOnboarding(userId: string, userEmail: string, input: CompleteOnboardingInput) {
  const admin = createAdminClient();
  const { segment } = input;

  let selectedSlugs: string[] = [];
  if (input.segments_json) {
    try {
      const parsed = JSON.parse(input.segments_json) as unknown;
      if (Array.isArray(parsed)) {
        selectedSlugs = parsed
          .filter((s): s is string => typeof s === "string")
          .map(s => (s === "outro" && input.custom_category) ? `outro:${input.custom_category}` : s);
      }
    } catch { /* ignore */ }
  }

  // ── Comprador ────────────────────────────────────────────────────────────
  if (segment === "buyer" || segment === "both") {
    await admin.from("buyers").insert({
      user_id:           userId,
      email:             userEmail,
      name:              userEmail.split("@")[0],
      purchase_frequency: input.purchase_frequency ?? null,
      lgpd_consent:      true,
      lgpd_consent_at:   new Date().toISOString(),
    }).maybeSingle();
  }

  // ── Fornecedor ───────────────────────────────────────────────────────────
  if (segment === "supplier" || segment === "both") {
    if (!input.trade_name || !input.cnpj || !input.phone) {
      return { errors: { general: ["Dados do fornecedor incompletos."] } };
    }

    const cleanedCNPJ = cleanCNPJ(input.cnpj);
    if (cleanedCNPJ.length !== 14) {
      return { errors: { cnpj: ["CNPJ inválido."] } };
    }

    const { data: existing } = await admin.from("suppliers").select("id").eq("cnpj", cleanedCNPJ).maybeSingle();
    if (existing) {
      return { errors: { cnpj: ["Este CNPJ já possui cadastro."] } };
    }

    let categoryIds: string[] = [];
    if (selectedSlugs.length > 0) {
      const { data: cats } = await admin.from("categories").select("id, slug").in("slug", selectedSlugs).eq("active", true);
      categoryIds = ((cats as { id: string; slug: string }[] | null) ?? []).map(c => c.id);
    }

    const { error: supplierError } = await admin.from("suppliers").insert({
      user_id:              userId,
      cnpj:                 cleanedCNPJ,
      company_name:         input.trade_name,
      trade_name:           input.trade_name,
      slug:                 supplierSlug(input.trade_name, ""),
      city:                 null,
      state:                null,
      phone:                input.phone,
      categories:           categoryIds,
      cnpj_status:          null,
      profile_completeness: 20,
    });

    if (supplierError) {
      if (supplierError.code === "23505") return { errors: { cnpj: ["Este CNPJ já está cadastrado."] } };
      return { message: "Erro ao salvar dados da empresa. Tente novamente." };
    }
  }

  // Atualiza metadata do usuário via Admin API
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { onboarding_complete: true, segment },
  });

  return { success: true };
}
