"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const AdminLoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type AdminLoginActionState = {
  errors?: Record<string, string[]>;
  message?: string;
};

const INVALID_ADMIN_CREDENTIALS_MESSAGE = "Email ou senha inválidos.";

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

  const supabase = await createClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !signInData.user) {
    return { message: INVALID_ADMIN_CREDENTIALS_MESSAGE };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", signInData.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { message: INVALID_ADMIN_CREDENTIALS_MESSAGE };
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function adminLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/admin/login");
}
