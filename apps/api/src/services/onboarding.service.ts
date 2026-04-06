import { cleanCNPJ, validateCNPJ } from "../lib/brasilapi.js";
import { calcCompleteness } from "../lib/completeness.js";
import { supplierSlug } from "../lib/slug.js";
import { createAdminClient } from "../lib/supabase.js";
import type { CompleteOnboardingInput } from "../schemas/onboarding.schema.js";

interface UserMetadata {
  full_name?: string;
  phone?: string;
  city?: string;
  state?: string;
}

function buildSupplierAddress(data: {
  logradouro?: string;
  numero?: string;
  bairro?: string;
}) {
  const parts = [data.logradouro, data.numero, data.bairro]
    .map(part => part?.trim())
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(", ") : null;
}

export async function completeOnboarding(
  userId: string,
  userEmail: string,
  input: CompleteOnboardingInput
) {
  const admin = createAdminClient();
  const { segment } = input;

  const userResult = await admin.auth.admin.getUserById(userId);
  if (userResult.error) {
    return { message: "Nao foi possivel carregar os dados da conta." };
  }

  const userMetadata = (userResult.data.user?.user_metadata ?? {}) as UserMetadata;
  const fullName = userMetadata.full_name?.trim() || userEmail.split("@")[0];
  const basePhone = userMetadata.phone?.trim() || null;
  const baseCity = userMetadata.city?.trim() || null;
  const baseState = userMetadata.state?.trim() || null;

  let selectedSlugs: string[] = [];
  if (input.segments_json) {
    try {
      const parsed = JSON.parse(input.segments_json) as unknown;
      if (Array.isArray(parsed)) {
        selectedSlugs = parsed
          .filter((value): value is string => typeof value === "string")
          .map(value => (
            value === "outro" && input.custom_category
              ? `outro:${input.custom_category}`
              : value
          ));
      }
    } catch {
      // ignore malformed local draft payloads
    }
  }

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
      return { message: "Erro ao salvar dados do comprador. Tente novamente." };
    }
  }

  if (segment === "supplier" || segment === "both") {
    if (!input.trade_name || !input.cnpj || !input.phone) {
      return { errors: { general: ["Dados do fornecedor incompletos."] } };
    }

    const cleanedCNPJ = cleanCNPJ(input.cnpj);
    if (cleanedCNPJ.length !== 14) {
      return { errors: { cnpj: ["CNPJ invalido."] } };
    }

    const cnpjValidation = await validateCNPJ(cleanedCNPJ);
    if (!cnpjValidation.valid || !cnpjValidation.data) {
      return {
        errors: {
          cnpj: [cnpjValidation.error ?? "Nao foi possivel validar o CNPJ informado."],
        },
      };
    }

    const { data: existing } = await admin
      .from("suppliers")
      .select("id")
      .eq("cnpj", cleanedCNPJ)
      .maybeSingle();

    if (existing) {
      return { errors: { cnpj: ["Este CNPJ ja possui cadastro."] } };
    }

    let categoryIds: string[] = [];
    if (selectedSlugs.length > 0) {
      const { data: categories, error: categoriesError } = await admin
        .from("categories")
        .select("id, slug")
        .in("slug", selectedSlugs)
        .eq("active", true);

      if (categoriesError) {
        return { message: "Erro ao validar categorias selecionadas." };
      }

      categoryIds = ((categories as { id: string; slug: string }[] | null) ?? []).map(
        category => category.id
      );
    }

    const cnpjData = cnpjValidation.data;
    const normalizedTradeName =
      input.trade_name.trim() ||
      cnpjData.nome_fantasia?.trim() ||
      cnpjData.razao_social.trim();
    const normalizedCity = cnpjData.municipio?.trim() || baseCity;
    const normalizedState = cnpjData.uf?.trim() || baseState;
    const normalizedPhone = input.phone.trim();

    if (!normalizedCity || !normalizedState) {
      return { message: "Nao foi possivel determinar a localizacao da empresa a partir do CNPJ." };
    }

    const address = buildSupplierAddress({
      logradouro: cnpjData.logradouro,
      numero: cnpjData.numero,
      bairro: cnpjData.bairro,
    });
    const profileCompleteness = calcCompleteness(
      {
        trade_name: normalizedTradeName,
        description: null,
        logo_url: null,
        phone: normalizedPhone,
        city: normalizedCity,
        state: normalizedState,
        categories: categoryIds.length > 0 ? categoryIds : null,
        photos: null,
        website: null,
        instagram: null,
      },
      0
    );

    const { error: supplierError } = await admin.from("suppliers").insert({
      user_id: userId,
      cnpj: cleanedCNPJ,
      company_name: cnpjData.razao_social.trim(),
      trade_name: normalizedTradeName,
      slug: supplierSlug(normalizedTradeName, normalizedCity ?? ""),
      city: normalizedCity,
      state: normalizedState,
      address,
      cep: cnpjData.cep?.replace(/\D/g, "") || null,
      phone: normalizedPhone,
      categories: categoryIds,
      cnpj_status: "ativa",
      is_verified: true,
      profile_completeness: profileCompleteness,
    });

    if (supplierError) {
      if (supplierError.code === "23505") {
        return { errors: { cnpj: ["Este CNPJ ja esta cadastrado."] } };
      }

      return { message: "Erro ao salvar dados da empresa. Tente novamente." };
    }
  }

  const metadataUpdate = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...userMetadata,
      onboarding_complete: true,
      segment,
    },
  });

  if (metadataUpdate.error) {
    return { message: "Os dados foram salvos, mas nao foi possivel finalizar o onboarding da conta." };
  }

  return { success: true };
}
