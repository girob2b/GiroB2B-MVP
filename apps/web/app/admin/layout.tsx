import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "./_components/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/painel/explorar");

  return <AdminShell email={authData.user.email ?? ""}>{children}</AdminShell>;
}
