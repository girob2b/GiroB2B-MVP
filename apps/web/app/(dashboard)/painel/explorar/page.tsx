import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Explorar" };

/**
 * /painel/explorar (PIVOT 2026-05-07).
 *
 * No modelo clássico esta era a tela principal de busca de produtos. Com o
 * pivô para reverse marketplace, o conteúdo central virou as necessidades —
 * o explorar de cliente logado vira atalho para o feed que faz mais sentido
 * pro papel do user:
 *   - supplier → /painel/leads (com paywall)
 *   - buyer ou both → /buscar (feed público)
 *
 * Componentes legados (explorer-search.tsx, catalog-suppliers-section.tsx,
 * complete-cadastro-card.tsx, web-search-panel.tsx, needs-dialog.tsx,
 * recent-needs-suggestions.tsx) ficam no filesystem como histórico. Serão
 * removidos na Fase 10 (sweep final).
 */
export default async function ExplorarPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/buscar");

  const admin = createAdminClient();
  const { data: supplier } = await admin
    .from("suppliers")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle<{ id: string }>();

  if (supplier) redirect("/painel/leads");
  redirect("/buscar");
}
