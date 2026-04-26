"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Não autenticado.");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Acesso negado.");
  return supabase;
}

export async function toggleSuspendSupplier(
  supplierId: string,
  suspend: boolean
): Promise<{ error?: string }> {
  try {
    const supabase = await assertAdmin();

    const { error } = await supabase
      .from("suppliers")
      .update({ suspended: suspend })
      .eq("id", supplierId);

    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro desconhecido." };
  }

  revalidatePath("/admin/fornecedores");
  revalidatePath("/admin");
  return {};
}
