import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * /painel → roteia conforme papel do user (PIVOT 2026-05-07; "both" removido em 2026-05-24):
 *   - supplier → /painel/leads
 *   - buyer    → /painel/necessidades
 *   - nenhum   → /painel/necessidades (default seguro do reverse marketplace)
 */
export default async function PainelPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const admin = createAdminClient();
  const [{ data: supplier }, { data: buyer }] = await Promise.all([
    admin.from("suppliers").select("id").eq("user_id", authData.user.id).maybeSingle(),
    admin.from("buyers").select("id").eq("user_id", authData.user.id).maybeSingle(),
  ]);

  if (supplier && !buyer) redirect("/painel/leads");
  redirect("/painel/necessidades");
}
