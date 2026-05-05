import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-session";
import AdminShell from "./_components/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await verifyAdminSession();
  if (!ok) redirect("/admin/login");

  const email = process.env.ADMIN_EMAIL ?? "admin";
  return <AdminShell email={email}>{children}</AdminShell>;
}
