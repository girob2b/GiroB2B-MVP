"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
});

export type ActionState = {
  errors?: Record<string, string[]>;
  message?: string;
};

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const result = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { message: "Email ou senha incorretos." };
    }
    if (error.message.includes("Email not confirmed")) {
      return { message: "Confirme seu email antes de entrar. Verifique sua caixa de entrada." };
    }
    return { message: "Erro ao entrar. Tente novamente." };
  }

  revalidatePath("/", "layout");
  redirect("/painel");
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
