"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { UpdateProfileSchema, UpdateSettingsSchema } from "@/lib/schemas/supplier";
import {
  getSupplierForUser,
  getSupplierIdForUser,
  updateSupplierProfile,
  updateSupplierSettings,
} from "@/lib/services/supplier";

export type ProfileState = {
  error?: string;
  success?: boolean;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message || fallback : fallback;
}

export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Sessão expirada. Faça login novamente." };

  const fields = {
    description: (formData.get("description") as string) || null,
    logo_url: (formData.get("logo_url") as string) || null,
    phone: (formData.get("phone") as string) || null,
    whatsapp: (formData.get("whatsapp") as string) || null,
    address: (formData.get("address") as string) || null,
    website: (formData.get("website") as string) || null,
    instagram: (formData.get("instagram") as string) || null,
    linkedin: (formData.get("linkedin") as string) || null,
    founded_year: formData.get("founded_year") ? parseInt(formData.get("founded_year") as string) : null,
    employee_count: (formData.get("employee_count") as string) || null,
    operating_hours: (formData.get("operating_hours") as string) || null,
    categories: formData.getAll("categories") as string[],
    photos: formData.getAll("photos") as string[],
    public_profile_layout: (() => {
      const raw = formData.get("public_profile_layout");
      if (typeof raw !== "string" || !raw.trim()) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })(),
  };

  const parsed = UpdateProfileSchema.safeParse(fields);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supplier = await getSupplierForUser(supabase, session.user.id);
  if (!supplier) return { error: "Fornecedor não encontrado." };

  try {
    await updateSupplierProfile(supabase, supplier, parsed.data);
  } catch (error) {
    return { error: errorMessage(error, "Erro ao salvar perfil.") };
  }

  revalidatePath("/painel");
  revalidatePath("/painel/perfil");

  return { success: true };
}

// ─── Atualização parcial do layout do perfil público ──────────────────────
// Usa PATCH /supplier/me só com public_profile_layout pra não sobrescrever
// outros campos com null (updateProfile envia o formData inteiro).
export type PublicProfileLayoutState = { error?: string; success?: boolean };

export async function updatePublicProfileLayout(
  _prevState: PublicProfileLayoutState,
  formData: FormData
): Promise<PublicProfileLayoutState> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Sessão expirada. Faça login novamente." };

  const raw = formData.get("public_profile_layout");
  if (typeof raw !== "string" || !raw.trim()) {
    return { error: "Layout inválido." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Layout inválido (JSON malformado)." };
  }

  try {
    const supplier = await getSupplierForUser(supabase, session.user.id);
    if (!supplier) return { error: "Fornecedor não encontrado." };

    const result = UpdateProfileSchema.pick({ public_profile_layout: true }).safeParse({
      public_profile_layout: parsed,
    });
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? "Layout inválido." };
    }

    await updateSupplierProfile(supabase, supplier, result.data);
  } catch (error) {
    return { error: errorMessage(error, "Erro ao salvar layout.") };
  }

  revalidatePath("/painel/perfil-publico");
  revalidatePath("/painel/perfil");
  return { success: true };
}

export type SettingsState = { error?: string; success?: boolean };

export async function updateCompanySettings(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Sessão expirada. Faça login novamente." };

  const str = (key: string) => (formData.get(key) as string | null) || undefined;
  const nullable = (key: string) => (formData.get(key) as string | null) || null;

  const parsed = UpdateSettingsSchema.safeParse({
    phone:               str("phone"),
    whatsapp:            nullable("whatsapp"),
    address:             nullable("address"),
    cep:                 nullable("cep"),
    city:                str("city"),
    state:               str("state"),
    inscricao_municipal: nullable("inscricao_municipal"),
    inscricao_estadual:  nullable("inscricao_estadual"),
    situacao_fiscal:     nullable("situacao_fiscal"),
    allow_relisting:     formData.get("allow_relisting") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supplierId = await getSupplierIdForUser(supabase, session.user.id);
  if (!supplierId) return { error: "Perfil de fornecedor não encontrado." };

  try {
    await updateSupplierSettings(supabase, supplierId, parsed.data);
  } catch (error) {
    return { error: errorMessage(error, "Erro ao salvar configurações.") };
  }

  revalidatePath("/painel/perfil");
  return { success: true };
}
