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

  // role vem do user_metadata (salvo pelo action de onboarding como "segment")
  // "both" é um valor válido que não existe na tabela user_profiles
  const meta = authData.user.user_metadata ?? {};
  let role = (meta.segment as string) || (meta.role as string) || "buyer";

  // Se não for "both" no metadata, vamos verificar se ele existe em ambas as tabelas
  // para garantir que o perfil reflita a realidade do banco de dados
  if (role !== "both") {
    const [supplierCheck, buyerCheck] = await Promise.all([
      supabase.from("suppliers").select("id").eq("user_id", userId).maybeSingle(),
      supabase.from("buyers").select("id").eq("user_id", userId).maybeSingle(),
    ]);
    
    if (supplierCheck.data && buyerCheck.data) {
      role = "both";
    } else if (supplierCheck.data) {
      role = "supplier";
    } else if (buyerCheck.data) {
      role = "buyer";
    }
  }

  // Buscar dados de supplier (quando aplicável)
  let supplier = null;
  if (role === "supplier" || role === "both") {
    const { data } = await supabase
      .from("suppliers")
      .select("id, trade_name, company_name, logo_url, plan, profile_completeness, slug, city, state")
      .eq("user_id", userId)
      .single();
    supplier = data;
  }

  // Buscar dados de buyer (quando aplicável). Inclui campos de "cadastro completo"
  // pra sidebar adaptativa (ver dashboard-shell.tsx).
  let buyer = null;
  let buyerProfileComplete = false;
  if (role === "buyer" || role === "both") {
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

  // "Cadastro completo" — pra sidebar e card de nudge:
  //   - supplier sempre é completo (insert exige dados mínimos B2B)
  //   - buyer-only depende dos campos B2B preenchidos via /painel/perfil
  //   - nenhum dos casos destrava se o user ainda não escolheu o modo de uso
  const cadastroCompleto =
    initialSegmentChosen &&
    (role === "supplier" || role === "both" || buyerProfileComplete);

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
