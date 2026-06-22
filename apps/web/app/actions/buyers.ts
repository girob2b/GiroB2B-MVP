"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setBuyerPublicProfileOptIn } from "@/lib/services/buyers";
import { SetBuyerPublicProfileOptInSchema } from "@/lib/schemas/buyers";

export type BuyerOptInActionState =
  | { ok: true; slug: string | null; optIn: boolean }
  | { ok: false; error: string };

/**
 * Liga/desliga o opt-in de perfil público da empresa COMPRADORA.
 *
 * - Só o próprio comprador autenticado pode chamar (validado por auth + a RPC
 *   resolve auth.uid() = dono da linha).
 * - Quando optIn=true, a RPC exige cnpj+company_name e grava consent versionado.
 * - Default do banco é false (privacidade por padrão).
 */
export async function setBuyerPublicProfileOptInAction(
  optIn: boolean
): Promise<BuyerOptInActionState> {
  // Runtime guard — TS garante em build, mas valida o tipo antes de qualquer I/O.
  const parsed = SetBuyerPublicProfileOptInSchema.safeParse({ opt_in: optIn });
  if (!parsed.success) {
    return { ok: false, error: "Parâmetro inválido." };
  }
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  const result = await setBuyerPublicProfileOptIn(supabase, optIn);
  if (!result.ok) return result;

  // Atualiza vitrine da home e o próprio perfil público (se já tem slug).
  revalidatePath("/");
  if (result.slug) revalidatePath(`/empresa/${result.slug}`);
  revalidatePath("/painel/configuracoes");

  return { ok: true, slug: result.slug, optIn: result.optIn };
}
