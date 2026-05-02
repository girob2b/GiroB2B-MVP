import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminLoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Login Administrativo",
  description: "Acesse o painel administrativo do GiroB2B.",
};

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (authData.user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profile?.role === "admin") {
      redirect("/admin");
    }

    redirect("/painel/explorar");
  }

  return (
    <div className="min-h-dvh bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <AdminLoginForm />
      </div>
    </div>
  );
}
