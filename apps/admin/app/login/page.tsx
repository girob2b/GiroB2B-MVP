import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/session";
import AdminLoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Login Administrativo",
  description: "Acesse o painel administrativo do GiroB2B.",
};

export default async function AdminLoginPage() {
  if (await verifyAdminSession()) redirect("/");

  return (
    <div className="min-h-dvh bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <AdminLoginForm />
      </div>
    </div>
  );
}
