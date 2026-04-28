import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Garante o perfil mínimo do usuário recém-logado (buyer mínimo + flags de onboarding).
 *
 *  - Buyer row mínimo (plataforma é B2B; sem buyer, /painel/perfil quebra).
 *  - `user_metadata.onboarding_complete = true` (libera o gate do proxy).
 *  - `user_metadata.initial_segment_chosen = false` se ainda não setado (sinaliza
 *    pro RoleModeCard mostrar UI de "primeira escolha" sem cooldown).
 *
 * Princípio "facilitar comprador" (project_buyer_friction_principle): cadastro
 * vira progressivo — login direto → plataforma; campos completam depois.
 *
 * Idempotente: se já tem buyer ou flag, no-op silencioso.
 */
export async function ensureMinimalProfile(supabase: SupabaseClient): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const alreadyComplete = user.user_metadata?.onboarding_complete === true;

  // Cria buyer mínimo se ainda não existir.
  const { data: existingBuyer } = await supabase
    .from("buyers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!existingBuyer) {
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "Comprador";

    const { error: insertErr } = await supabase.from("buyers").insert({
      user_id:         user.id,
      name:            fullName,
      email:           user.email ?? "",
      lgpd_consent:    true,
      lgpd_consent_at: new Date().toISOString(),
    });
    if (insertErr) {
      console.error("[ensureMinimalProfile] insert buyer failed:", insertErr);
      // Continua mesmo com erro — user pode tentar criar buyer depois via /painel/perfil.
    }
  }

  if (!alreadyComplete) {
    const { error: metaErr } = await supabase.auth.updateUser({
      data: {
        onboarding_complete: true,
        initial_segment_chosen:
          user.user_metadata?.initial_segment_chosen ?? false,
      },
    });
    if (metaErr) {
      console.error("[ensureMinimalProfile] updateUser failed:", metaErr);
    }
  }
}
