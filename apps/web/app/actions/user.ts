"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UpdatePlatformUsageState = { error?: string; success?: boolean };

export async function updatePlatformUsage(
  _prev: UpdatePlatformUsageState,
  formData: FormData
): Promise<UpdatePlatformUsageState> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const user = authData.user;
  const mode = formData.get("mode") as string;
  const wantsBuyer    = mode === "buyer"    || mode === "both";
  const wantsSupplier = mode === "supplier" || mode === "both";

  const [supplierRes, buyerRes] = await Promise.all([
    supabase.from("suppliers").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("buyers").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const hasSupplier = !!supplierRes.data;
  const hasBuyer    = !!buyerRes.data;

  // Ativar modo comprador
  if (wantsBuyer && !hasBuyer) {
    const { error } = await supabase.from("buyers").insert({
      user_id:         user.id,
      name:            (user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0] || "Comprador",
      email:           user.email ?? "",
      lgpd_consent:    true,
      lgpd_consent_at: new Date().toISOString(),
    });
    if (error) return { error: "Erro ao ativar modo comprador. Tente novamente." };
  }

  // Desativar modo comprador
  if (!wantsBuyer && hasBuyer) {
    const { error } = await supabase.from("buyers").delete().eq("user_id", user.id);
    if (error) return { error: "Erro ao desativar modo comprador. Tente novamente." };
  }

  // Ativar modo vendedor — requer cadastro completo, não é possível inline
  if (wantsSupplier && !hasSupplier) {
    return { error: "Para ativar o modo vendedor complete o cadastro de fornecedor primeiro." };
  }

  // Desativar modo vendedor — requer suporte
  if (!wantsSupplier && hasSupplier) {
    return { error: "Para desativar o modo vendedor entre em contato com o suporte." };
  }

  revalidatePath("/painel/perfil");
  return { success: true };
}
