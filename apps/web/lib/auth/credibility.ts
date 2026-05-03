import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const AUTH_PROVIDERS = {
  email:    { level: 1, label: "E-mail",              color: "slate"  },
  google:   { level: 2, label: "Google",              color: "blue"   },
  cert_a1:  { level: 3, label: "Certificado Digital", color: "green"  },
} as const;

export type AuthProvider = keyof typeof AUTH_PROVIDERS;

/**
 * Atualiza auth_provider e credibility_level do usuário logado.
 * O nível só sobe — nunca desce.
 */
export async function updateCredibility(
  supabase: SupabaseClient,
  userId: string,
  provider: AuthProvider,
): Promise<void> {
  const newLevel = AUTH_PROVIDERS[provider].level;

  const { error } = await supabase.rpc("upsert_user_credibility", {
    p_user_id:   userId,
    p_provider:  provider,
    p_new_level: newLevel,
  });

  if (error) {
    // Non-fatal: log but don't break the login flow.
    console.error("[credibility] update failed:", error.message);
  }
}
