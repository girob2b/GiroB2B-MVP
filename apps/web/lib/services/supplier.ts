import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calcCompleteness } from "@/lib/completeness";
import { supplierSlug } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncDerivedUserRoleWithAdmin } from "@/lib/services/user-role";
import type { UpgradeSupplierInput, UpdateProfileInput, UpdateSettingsInput } from "@/lib/schemas/supplier";

type SupplierLookup = {
  id: string;
  trade_name: string | null;
  city: string | null;
  state: string | null;
};

type SupplierCompletenessFields = {
  description: string | null;
  logo_url: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  categories: string[] | null;
  operating_hours: string | null;
  founded_year: number | null;
};

type SupplierMutationResult =
  | { success: true }
  | { message: string }
  | { errors: Record<string, string[]> };

type UserMetadata = {
  full_name?: string;
  phone?: string;
  city?: string;
  state?: string;
  onboarding_complete?: boolean;
};

function cleanCNPJ(value: string): string {
  return value.replace(/\D/g, "");
}

export async function getSupplierIdForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("suppliers")
    .select("id")
    .eq("user_id", userId)
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

export async function getSupplierForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<SupplierLookup | null> {
  const { data } = await supabase
    .from("suppliers")
    .select("id, trade_name, city, state")
    .eq("user_id", userId)
    .single();
  return (data as SupplierLookup | null) ?? null;
}

export async function recalcSupplierCompleteness(
  supabase: SupabaseClient,
  supplierId: string,
  fallback?: { city: string | null; state: string | null }
): Promise<number | null> {
  const [supplierResult, productsResult] = await Promise.all([
    supabase
      .from("suppliers")
      .select("description, logo_url, phone, city, state, categories, operating_hours, founded_year")
      .eq("id", supplierId)
      .single(),
    supabase
      .from("products")
      .select("images")
      .eq("supplier_id", supplierId)
      .eq("status", "active"),
  ]);

  if (supplierResult.error || !supplierResult.data) return null;

  const current = supplierResult.data as SupplierCompletenessFields;
  const productList = (productsResult.data ?? []) as { images: string[] | null }[];
  const productCount = productList.length;
  const productsWithPhotosCount = productList.filter(
    product => Array.isArray(product.images) && product.images.length > 0
  ).length;

  const completeness = calcCompleteness(
    {
      ...current,
      city: current.city ?? fallback?.city ?? null,
      state: current.state ?? fallback?.state ?? null,
      categories: current.categories?.length ? current.categories : null,
    },
    productCount,
    productsWithPhotosCount
  );

  await supabase
    .from("suppliers")
    .update({ profile_completeness: completeness })
    .eq("id", supplierId);

  return completeness;
}

export async function updateSupplierProfile(
  supabase: SupabaseClient,
  supplier: SupplierLookup,
  input: UpdateProfileInput
): Promise<{ completeness: number }> {
  const { data: currentData, error: currentError } = await supabase
    .from("suppliers")
    .select("description, logo_url, phone, city, state, categories, operating_hours, founded_year")
    .eq("id", supplier.id)
    .single();

  if (currentError || !currentData) throw new Error("Fornecedor não encontrado.");

  const current = currentData as SupplierCompletenessFields;
  const { public_profile_layout, ...profileFields } = input;
  const merged: SupplierCompletenessFields = {
    description: profileFields.description !== undefined ? profileFields.description : current.description,
    logo_url: profileFields.logo_url !== undefined ? profileFields.logo_url : current.logo_url,
    phone: profileFields.phone !== undefined ? profileFields.phone : current.phone,
    city: current.city ?? supplier.city,
    state: current.state ?? supplier.state,
    categories: profileFields.categories !== undefined ? profileFields.categories : current.categories,
    operating_hours: profileFields.operating_hours !== undefined
      ? profileFields.operating_hours
      : current.operating_hours,
    founded_year: profileFields.founded_year !== undefined
      ? profileFields.founded_year
      : current.founded_year,
  };

  const { data: products } = await supabase
    .from("products")
    .select("images")
    .eq("supplier_id", supplier.id)
    .eq("status", "active");

  const productList = (products ?? []) as { images: string[] | null }[];
  const productCount = productList.length;
  const productsWithPhotosCount = productList.filter(
    product => Array.isArray(product.images) && product.images.length > 0
  ).length;

  const completeness = calcCompleteness(
    merged.categories?.length ? merged : { ...merged, categories: null },
    productCount,
    productsWithPhotosCount
  );

  if (Object.keys(profileFields).length > 0) {
    const { error } = await supabase
      .from("suppliers")
      .update({ ...profileFields, profile_completeness: completeness })
      .eq("id", supplier.id);

    if (error) throw new Error("Erro ao atualizar perfil.");
  }

  if (public_profile_layout !== undefined) {
    const { error: layoutError } = await supabase
      .from("suppliers")
      .update({ public_profile_layout })
      .eq("id", supplier.id);

    if (layoutError) {
      const message = layoutError.message || "";
      if (!message.toLowerCase().includes("public_profile_layout")) {
        throw new Error("Erro ao atualizar perfil.");
      }
    }
  }

  return { completeness };
}

export async function updateSupplierSettings(
  supabase: SupabaseClient,
  supplierId: string,
  input: UpdateSettingsInput
): Promise<void> {
  const { error } = await supabase
    .from("suppliers")
    .update(input)
    .eq("id", supplierId);
  if (error) throw new Error("Erro ao salvar configurações.");
}

export async function createSupplierUpgrade(
  userId: string,
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
      // Ignore malformed local draft payloads.
    }
  }

  let categoryIds: string[] = [];
  if (selectedSlugs.length > 0) {
    const { data: categories, error } = await admin
      .from("categories")
      .select("id, slug")
      .in("slug", selectedSlugs)
      .eq("active", true);

    if (error) return { message: "Erro ao validar categorias selecionadas." };
    categoryIds = ((categories as { id: string; slug: string }[] | null) ?? []).map(
      category => category.id
    );
  }

  const normalizedTradeName = input.trade_name.trim();
  const normalizedCompanyName = input.company_name?.trim() || normalizedTradeName;
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
    address: null,
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
