import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/session";
import AdminShell from "./_components/admin-shell";

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  if (!(await verifyAdminSession())) redirect("/login");
  const email = process.env.ADMIN_EMAIL ?? "admin";
  return <AdminShell email={email}>{children}</AdminShell>;
}
