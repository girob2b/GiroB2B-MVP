import { cleanCNPJ } from "../lib/brasilapi.js";
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

  // Validação externa de CNPJ (BrasilAPI/ReceitaWS) está desligada neste MVP.
  // Quando voltar, plugar aqui antes do select de duplicidade abaixo.

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

  const normalizedTradeName = input.trade_name.trim();
  const normalizedCompanyName =
    input.company_name?.trim() || normalizedTradeName;
  const normalizedCity = input.city?.trim() || baseCity;
  const normalizedState = input.state?.trim().toUpperCase() || baseState?.toUpperCase() || null;
  const normalizedPhone = input.phone.trim();

  if (!normalizedCity || !normalizedState) {
    return {
      errors: {
        city: !normalizedCity ? ["Informe a cidade da empresa."] : [],
        state: !normalizedState ? ["Informe o estado (UF)."] : [],
      },
    };
  }

  // CEP e endereço ficam para preencher depois em /painel/perfil-publico ou /painel/perfil.
  const address = null;

  const profileCompleteness = calcCompleteness(
    {
      description: null,
      logo_url: null,
      phone: normalizedPhone,
      city: normalizedCity,
      state: normalizedState,
      categories: categoryIds.length > 0 ? categoryIds : null,
      operating_hours: null,
      founded_year: null,
    },
    0,
    0
  );

  const { error: supplierError } = await admin.from("suppliers").insert({
    user_id: userId,
    cnpj: cleanedCNPJ,
    company_name: normalizedCompanyName,
    trade_name: normalizedTradeName,
    slug: supplierSlug(normalizedTradeName, normalizedCity),
    city: normalizedCity,
    state: normalizedState,
    address,
    cep: null,
    phone: normalizedPhone,
    categories: categoryIds,
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

  const { data: products } = await supabase
    .from("products")
    .select("images")
    .eq("supplier_id", supplierId)
    .eq("status", "active");

  const productList = (products ?? []) as { images: string[] | null }[];
  const productCount = productList.length;
  const productsWithPhotosCount = productList.filter(
    p => Array.isArray(p.images) && p.images.length > 0
  ).length;

  const { public_profile_layout, ...rest } = input as UpdateProfileInput & {
    public_profile_layout?: unknown;
  };

  void tradeName; // mantido na assinatura (cadastro inicial), mas não entra no cálculo da RN-02.01

  const completeness = calcCompleteness(
    {
      description:     rest.description ?? null,
      logo_url:        rest.logo_url ?? null,
      phone:           rest.phone ?? null,
      city,
      state,
      categories:      rest.categories?.length ? rest.categories : null,
      operating_hours: rest.operating_hours ?? null,
      founded_year:    rest.founded_year ?? null,
    },
    productCount,
    productsWithPhotosCount
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
