"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Marca o tutorial como visto (completo ou pulado — mesma action).
 * Grava timestamp em user_metadata.tutorial_completed_at.
 *
 * O dashboard layout lê esse campo no SSR e só monta o <TutorialRunner />
 * quando é null/undefined — primeira sessão do user.
 *
 * Idempotente: chamadas extras simplesmente sobrescrevem o timestamp.
 */
export async function markTutorialCompleted(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false };

  const { error } = await supabase.auth.updateUser({
    data: {
      tutorial_completed_at: new Date().toISOString(),
    },
  });

  if (error) {
    console.error("[tutorial] markTutorialCompleted failed:", error);
    return { ok: false };
  }
  return { ok: true };
}
