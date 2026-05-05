"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminSession, deleteAdminSession } from "@/lib/admin-session";

const AdminLoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type AdminLoginActionState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function adminLogin(
  _prevState: AdminLoginActionState | undefined,
  formData: FormData
): Promise<AdminLoginActionState> {
  const parsed = AdminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (
    !adminEmail ||
    !adminPassword ||
    parsed.data.email !== adminEmail ||
    parsed.data.password !== adminPassword
  ) {
    return { message: "Email ou senha inválidos." };
  }

  await createAdminSession();
  redirect("/admin");
}

export async function adminLogout() {
  await deleteAdminSession();
  redirect("/admin/login");
}
