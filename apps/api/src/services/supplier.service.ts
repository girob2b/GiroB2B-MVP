import { cleanCNPJ, validateCNPJ } from "../lib/brasilapi.js";
import { calcCompleteness } from "../lib/completeness.js";
import { supplierSlug } from "../lib/slug.js";
import { createAdminClient, createClient } from "../lib/supabase.js";
import { syncDerivedUserRoleWithAdmin } from "../lib/user-role.js";
import type {
  UpgradeSupplierInput,
  UpdateProfileInput,
  UpdateSettingsInput,
} from "../schemas/supplier.schema.js";

interface UserMetadata {
  full_name?: string;
  phone?: string;
  city?: string;
  state?: string;
  onboarding_complete?: boolean;
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

type SupplierMutationResult =
  | { success: true }
  | { message: string }
  | { errors: Record<string, string[]> };

export async function createSupplierUpgrade(
  userId: string,
  userEmail: string,
  input: UpgradeSupplierInput
): Promise<SupplierMutationResult> {
  const admin = createAdminClient();

  const userResult = await admin.auth.admin.getUserById(userId);
  if (userResult.error) {
    return { message: "Nao foi possivel carregar os dados da conta." };
  }

  const userMetadata = (userResult.data.user?.user_metadata ?? {}) as UserMetadata;
  const baseCity = userMetadata.city?.trim() || null;
  const baseState = userMetadata.state?.trim() || null;

  const { data: supplierByUser } = await admin
    .from("suppliers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();

  if (supplierByUser) {
    return { errors: { general: ["Este usuario ja possui um perfil de fornecedor."] } };
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

  const { data: existingByCNPJ } = await admin
    .from("suppliers")
    .select("id")
    .eq("cnpj", cleanedCNPJ)
    .maybeSingle<{ id: string }>();

  if (existingByCNPJ) {
    return { errors: { cnpj: ["Este CNPJ ja possui cadastro."] } };
  }

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
      // Ignore malformed local draft payloads
    }
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
    slug: supplierSlug(normalizedTradeName, normalizedCity),
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

  const metadataResult = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...userMetadata,
      onboarding_complete: true,
    },
  });

  if (metadataResult.error) {
    return { message: "Os dados foram salvos, mas nao foi possivel atualizar a conta." };
  }

  await syncDerivedUserRoleWithAdmin(admin, userId);

  return { success: true };
}

export async function getSupplierByUserId(userId: string, token: string) {
  const supabase = createClient(token);
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data;
}

export async function updateSupplierProfile(
  supplierId: string,
  tradeName: string,
  city: string,
  state: string,
  input: UpdateProfileInput,
  token: string
) {
  const supabase = createClient(token);

  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("supplier_id", supplierId)
    .eq("status", "active");

  const { public_profile_layout, ...rest } = input as UpdateProfileInput & {
    public_profile_layout?: unknown;
  };

  const completeness = calcCompleteness(
    {
      trade_name:  tradeName,
      description: rest.description ?? null,
      logo_url:    rest.logo_url ?? null,
      phone:       rest.phone ?? null,
      city,
      state,
      categories:  rest.categories?.length ? rest.categories : null,
      photos:      rest.photos?.length ? rest.photos : null,
      website:     rest.website ?? null,
      instagram:   rest.instagram ?? null,
    },
    productCount ?? 0
  );

  const { error } = await supabase
    .from("suppliers")
    .update({ ...rest, profile_completeness: completeness })
    .eq("id", supplierId);

  if (error) throw new Error("Erro ao atualizar perfil.");

  if (public_profile_layout !== undefined) {
    const { error: layoutError } = await supabase
      .from("suppliers")
      .update({ public_profile_layout })
      .eq("id", supplierId);

    if (layoutError) {
      const msg = layoutError.message || "";
      if (!msg.toLowerCase().includes("public_profile_layout")) {
        throw new Error("Erro ao atualizar perfil.");
      }
    }
  }

  return { completeness };
}

export async function updateSupplierSettings(
  supplierId: string,
  input: UpdateSettingsInput,
  token: string
) {
  const supabase = createClient(token);
  const { error } = await supabase
    .from("suppliers")
    .update(input)
    .eq("id", supplierId);
  if (error) throw new Error("Erro ao salvar configurações.");
}

export async function getSupplierIdForUser(userId: string, token: string): Promise<string | null> {
  const supabase = createClient(token);
  const { data } = await supabase
    .from("suppliers")
    .select("id")
    .eq("user_id", userId)
    .single();
  return (data as { id: string } | null)?.id ?? null;
}
