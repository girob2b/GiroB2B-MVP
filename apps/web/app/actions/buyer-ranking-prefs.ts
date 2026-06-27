"use server";

import { createClient } from "@/lib/supabase/server";
import { UpdateBuyerRankingPrefsSchema } from "@/lib/schemas/comparator";
import { updateBuyerRankingPrefs } from "@/lib/services/comparator";
import type { UpdateBuyerRankingPrefsInput } from "@/lib/schemas/comparator";

export type BuyerRankingPrefsActionState =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Atualiza as preferências de ranking do comprador (pesos + preferência de pagamento).
 *
 * - Só o próprio comprador autenticado pode chamar (auth.uid() passado ao service).
 * - Os campos são opcionais: o comprador pode atualizar só os pesos ou só o pagamento.
 * - Enviar undefined em um campo não o altera; null o reseta para o default.
 * - O score do comparador passa a usar os novos pesos na próxima chamada ao endpoint.
 *
 * Não invalida cache (os dados do comparador já vêm com Cache-Control: no-store).
 */
export async function updateBuyerRankingPrefsAction(
  input: UpdateBuyerRankingPrefsInput
): Promise<BuyerRankingPrefsActionState> {
  // Validação Zod no entry-point (camada de Server Action).
  const parsed = UpdateBuyerRankingPrefsSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = Object.values(
      parsed.error.flatten().fieldErrors
    )[0]?.[0];
    return {
      ok: false,
      error: firstError ?? "Dados de preferência inválidos.",
    };
  }

  // Autenticação
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  // Persiste via service layer
  return updateBuyerRankingPrefs(authData.user.id, parsed.data);
}
