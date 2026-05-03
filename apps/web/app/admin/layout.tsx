import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "./_components/admin-shell";
import { isSuspendedAccountStatus } from "@/lib/auth/account-status";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) redirect("/admin/login");

  const [{ data: profile }, { data: profileStatus }, { data: legacySupplierStatus }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle(),
    supabase.from("user_profiles").select("status").eq("id", authData.user.id).maybeSingle(),
    supabase.from("suppliers").select("suspended").eq("user_id", authData.user.id).maybeSingle(),
  ]);

  if (isSuspendedAccountStatus(profileStatus?.status, Boolean(legacySupplierStatus?.suspended))) {
    redirect("/suspended");
  }

  if (profile?.role !== "admin") redirect("/painel/explorar");

  return <AdminShell email={authData.user.email ?? ""}>{children}</AdminShell>;
}
