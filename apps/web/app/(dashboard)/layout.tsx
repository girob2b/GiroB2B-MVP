import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/layout/dashboard-shell";

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

  // Buscar dados de buyer (quando aplicável)
  let buyer = null;
  if (role === "buyer" || role === "both") {
    const { data } = await supabase
      .from("buyers")
      .select("id, name")
      .eq("user_id", userId)
      .single();
    buyer = data;
  }

  // full_name do user_profiles (fallback para user_metadata)
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

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
      initialCollapsed={initialCollapsed}
    >
      {children}
    </DashboardShell>
  );
}
