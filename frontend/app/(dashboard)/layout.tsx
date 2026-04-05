import { redirect } from "next/navigation";
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
      .select("id, trade_name, logo_url, plan, profile_completeness, slug")
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

  return (
    <DashboardShell
      user={{ id: userId, email: userEmail, role }}
      supplier={supplier}
      buyer={buyer}
    >
      {children}
    </DashboardShell>
  );
}
