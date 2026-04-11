"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { apiClient } from "@/lib/api-client";

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

  try {
    const client = apiClient(session.access_token);
    await client.patch("/supplier/me", fields);
  } catch (error) {
    return { error: errorMessage(error, "Erro ao salvar perfil.") };
  }

  revalidatePath("/painel");
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

  const get = (key: string) => (formData.get(key) as string) || null;

  const fields = {
    phone:                get("phone") ?? "",
    whatsapp:             get("whatsapp"),
    address:              get("address"),
    cep:                  get("cep"),
    city:                 get("city") ?? "",
    state:                get("state") ?? "",
    inscricao_municipal:  get("inscricao_municipal"),
    inscricao_estadual:   get("inscricao_estadual"),
    situacao_fiscal:      get("situacao_fiscal"),
  };

  try {
    const client = apiClient(session.access_token);
    await client.patch("/supplier/settings", fields);
  } catch (error) {
    return { error: errorMessage(error, "Erro ao salvar configurações.") };
  }

  revalidatePath("/painel/configuracoes");
  return { success: true };
}
