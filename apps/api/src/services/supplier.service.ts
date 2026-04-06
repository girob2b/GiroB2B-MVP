import { createClient } from "../lib/supabase.js";
import { calcCompleteness } from "../lib/completeness.js";
import type { UpdateProfileInput, UpdateSettingsInput } from "../schemas/supplier.schema.js";

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
