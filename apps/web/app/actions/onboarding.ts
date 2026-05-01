"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompleteOnboardingSchema } from "@/lib/schemas/onboarding";
import { completeOnboardingForUser } from "@/lib/services/onboarding";

export type OnboardingState = {
  errors?: Record<string, string[]>;
  message?: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

export async function completeOnboarding(
  _prevState: OnboardingState | undefined,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return { message: "Sessão expirada. Faça login novamente." };

  // Lê todos os campos do form. Filtra valores vazios/null pra não bater no
  // Zod .optional() do backend (que aceita undefined mas NÃO aceita "" ou null).
  const raw = {
    segment: formData.get("segment"),
    trade_name: formData.get("trade_name"),
    company_name: formData.get("company_name"),
    cnpj: formData.get("cnpj"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    state: formData.get("state"),
    segments_json: formData.get("segments_json"),
    purchase_frequency: formData.get("purchase_frequency"),
    custom_category: formData.get("custom_category"),
  };

  const payload: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value.trim() !== "") {
      payload[key] = value;
    }
  }

  const parsed = CompleteOnboardingSchema.safeParse(payload);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await completeOnboardingForUser(
      session.user.id,
      session.user.email ?? "",
      parsed.data
    );

    if (!("success" in result)) return result;
  } catch (error) {
    return { message: errorMessage(error) || "Erro ao processar onboarding." };
  }

  // Força refresh da sessão pra que o JWT no cookie reflita o onboarding_complete=true
  // que o backend acabou de gravar via admin API. Sem isso, o middleware (proxy.ts) lê
  // o JWT antigo na próxima request e redireciona de volta pra /onboarding em loop.
  const { error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshErr) {
    console.error("[completeOnboarding] refreshSession failed:", refreshErr);
  }

  revalidatePath("/", "layout");
  redirect("/painel");
}


// ─── Pular onboarding ─────────────────────────────────────────────────────
// Cria buyer row mínimo (a plataforma é B2B; todo user precisa de ao menos
// um buyer pra usar /painel/perfil) e marca onboarding_complete=true no
// user_metadata pra liberar o middleware proxy.ts.
export async function skipOnboarding(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Cria buyer mínimo se não existir.
  const { data: existingBuyer } = await supabase
    .from("buyers")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle<{ id: string }>();

  if (!existingBuyer) {
    const { error: insertErr } = await supabase.from("buyers").insert({
      user_id:         user!.id,
      name:            (user!.user_metadata?.full_name as string | undefined) || user!.email?.split("@")[0] || "Comprador",
      email:           user!.email ?? "",
      lgpd_consent:    true,
      lgpd_consent_at: new Date().toISOString(),
    });
    if (insertErr) {
      console.error("[skipOnboarding] insert buyer failed:", insertErr);
      // Continua mesmo com erro — o user pode tentar criar buyer depois via /painel/perfil
    }
  }

  // Marca onboarding como completo (libera o middleware) E sinaliza que o user
  // ainda NÃO fez a primeira escolha consciente do modo de uso. O RoleModeCard
  // detecta initial_segment_chosen=false e mostra UI de "primeira escolha" sem
  // cooldown nem aprovação admin (chooseInitialMode em vez de requestRoleChange).
  const { error: metaErr } = await supabase.auth.updateUser({
    data: { onboarding_complete: true, initial_segment_chosen: false },
  });
  if (metaErr) {
    console.error("[skipOnboarding] updateUser failed:", metaErr);
    throw new Error("Não foi possível pular o onboarding. Tente novamente.");
  }

  // Força refresh da sessão pra que o JWT no cookie reflita o novo metadata.
  // Sem isso, o middleware (proxy.ts) lê o JWT antigo (sem onboarding_complete)
  // na próxima request e redireciona de volta pra /onboarding em loop.
  const { error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshErr) {
    console.error("[skipOnboarding] refreshSession failed:", refreshErr);
  }

  revalidatePath("/", "layout");
  redirect("/painel");
}
