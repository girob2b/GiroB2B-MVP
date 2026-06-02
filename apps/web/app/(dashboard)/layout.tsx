import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/layout/dashboard-shell";
import { isSuspendedAccountStatus } from "@/lib/auth/account-status";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/login");
  }

  const userId    = authData.user.id;
  const userEmail = authData.user.email ?? "";
  const [{ data: profile }, { data: profileStatus }, { data: legacySupplierStatus }] = await Promise.all([
    supabase.from("user_profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase.from("user_profiles").select("status").eq("id", userId).maybeSingle(),
    supabase.from("suppliers").select("suspended").eq("user_id", userId).maybeSingle(),
  ]);

  if (isSuspendedAccountStatus(profileStatus?.status, Boolean(legacySupplierStatus?.suspended))) {
    redirect("/suspended");
  }

  // Role binário (decisão 2026-05-24 — "both" removido).
  // Fonte: user_metadata.segment → fallback pra checagem na tabela suppliers/buyers.
  // Se user existe nas DUAS tabelas (dado legado), prevalece "supplier"
  // (preserva assinatura — ver migration 044 + decisão em AVISOS).
  const meta = authData.user.user_metadata ?? {};
  const metaSegment = (meta.segment as string) || (meta.role as string) || "";
  let role: "buyer" | "supplier" =
    metaSegment === "supplier" ? "supplier" : "buyer";

  // Confirma com o banco — supplier vence se houver registro em ambas as tabelas.
  const [supplierCheck, buyerCheck] = await Promise.all([
    supabase.from("suppliers").select("id").eq("user_id", userId).maybeSingle(),
    supabase.from("buyers").select("id").eq("user_id", userId).maybeSingle(),
  ]);
  if (supplierCheck.data) {
    role = "supplier";
  } else if (buyerCheck.data) {
    role = "buyer";
  }

  // Buscar dados de supplier (quando aplicável)
  let supplier = null;
  if (role === "supplier") {
    const { data } = await supabase
      .from("suppliers")
      .select("id, trade_name, company_name, logo_url, plan, profile_completeness, slug, city, state")
      .eq("user_id", userId)
      .single();
    supplier = data;
  }

  // Buscar dados de buyer (quando aplicável). Inclui campos de "cadastro completo".
  let buyer = null;
  let buyerProfileComplete = false;
  if (role === "buyer") {
    const { data } = await supabase
      .from("buyers")
      .select("id, name, phone, cnpj, company_name, city, state, address")
      .eq("user_id", userId)
      .single();
    buyer = data ? { id: data.id, name: data.name } : null;
    buyerProfileComplete = !!(
      data?.name &&
      data.phone &&
      data.cnpj &&
      data.company_name &&
      data.city &&
      data.state &&
      data.address
    );
  }

  // Modo de uso nunca foi escolhido explicitamente → trava tudo até o user
  // confirmar no RoleModeCard (chooseInitialMode). Evita desbloquear opções
  // só por ter dados preenchidos, sem ter escolhido como vai usar a plataforma.
  const initialSegmentChosen = (meta.initial_segment_chosen as boolean | undefined) !== false;

  // "Cadastro completo" pra liberar nav extra:
  //   - supplier sempre é completo (insert exige dados mínimos B2B)
  //   - buyer depende dos campos B2B preenchidos via /painel/perfil
  //   - nenhum destrava se o user ainda não escolheu o modo de uso
  const cadastroCompleto =
    initialSegmentChosen && (role === "supplier" || buyerProfileComplete);

  const fullName =
    (profile?.full_name ?? "").trim() ||
    ((authData.user.user_metadata?.full_name as string | undefined) ?? "").trim();

  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("girob2b_sidebar")?.value === "1";

  return (
    <DashboardShell
      user={{ id: userId, email: userEmail, role, fullName }}
      supplier={supplier}
      buyer={buyer}
      cadastroCompleto={cadastroCompleto}
      initialCollapsed={initialCollapsed}
    >
      {children}
    </DashboardShell>
  );
}
