"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server action de signup de vendedor pós-waitlist aprovada.
 *
 * Decisão Vitor 2026-05-24: substitui a necessidade de magic link via email
 * (Resend fake). User digitou email aprovado no /seja-vendedor, recebeu
 * approval_token, agora completa signup com senha + dados B2B mínimos.
 *
 * Validações:
 *   - approval_token existe, não-expirado, não-usado, vinculado a row
 *     waitlist com role=supplier AND status=approved
 *   - email do form == email da waitlist row (anti-troca de email)
 *   - senha >= 8 chars
 *   - aceitou LGPD
 *
 * Side effects (1 transação lógica, com cleanup em caso de falha tardia):
 *   1. Cria auth user via admin API (sem confirmação por email — já validamos)
 *   2. Cria row em `suppliers` com dados da waitlist (cnpj, category, etc)
 *   3. Marca approval_token_used_at = now() na waitlist row
 *   4. Define subscription_status='inactive' (admin ativa trial separadamente)
 *
 * Retorna { ok: true } ou { ok: false, message }. Em sucesso, o client
 * redireciona pra /login?status=cadastro_concluido.
 */

const SignupSchema = z.object({
  approval_token: z.string().uuid("Token inválido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha precisa ter pelo menos 8 caracteres"),
  full_name: z.string().min(2, "Nome muito curto").max(120),
  lgpd_consent: z.literal("on", { error: "Você precisa aceitar os Termos e Política" }),
});

export type SupplierSignupState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function createSupplierFromApprovedWaitlist(
  _prev: SupplierSignupState,
  formData: FormData,
): Promise<SupplierSignupState> {
  const raw = {
    approval_token: formData.get("approval_token"),
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    lgpd_consent: formData.get("lgpd_consent"),
  };

  const parsed = SignupSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "general";
      if (!errors[key]) errors[key] = [];
      errors[key].push(issue.message);
    }
    return { ok: false, errors };
  }

  const { approval_token, email, password, full_name } = parsed.data;
  const admin = createAdminClient();

  // Re-valida o token (defesa em profundidade — entre o page render e o submit
  // o token pode ter expirado/sido revogado).
  const { data: row } = await admin
    .from("waitlist")
    .select("id, email, cnpj, category, status, approval_token_expires_at, approval_token_used_at")
    .eq("approval_token", approval_token)
    .eq("role", "supplier")
    .maybeSingle<{
      id: string;
      email: string;
      cnpj: string;
      category: string;
      status: string;
      approval_token_expires_at: string;
      approval_token_used_at: string | null;
    }>();

  if (!row) return { ok: false, message: "Token de aprovação inválido." };
  if (row.status !== "approved") return { ok: false, message: "Sua aprovação foi revogada. Entre em contato com comercial@girob2b.com.br." };
  if (row.approval_token_used_at) return { ok: false, message: "Esse token já foi usado." };
  if (new Date(row.approval_token_expires_at) < new Date()) {
    return { ok: false, message: "Token expirado. Gere um novo na lista de espera." };
  }
  if (row.email !== email.trim().toLowerCase()) {
    return { ok: false, message: "Email do cadastro não bate com o da aprovação." };
  }

  // Cria user com email já confirmado (waitlist serve de validação).
  const createUser = await admin.auth.admin.createUser({
    email: row.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name,
      segment: "supplier",
      initial_segment_chosen: true,
      tutorial_completed_at: null,
      // Marca origem da conta pra audit (futuro).
      signup_source: "waitlist_approved",
    },
  });

  if (createUser.error || !createUser.data.user) {
    const msg = createUser.error?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return { ok: false, message: "Esse email já tem conta na plataforma. Faça login." };
    }
    console.error("[supplier-signup] createUser failed:", createUser.error);
    return { ok: false, message: "Não foi possível criar sua conta. Tente novamente." };
  }

  const userId = createUser.data.user.id;

  // Cria row em suppliers — dados mínimos vêm da waitlist row.
  // Slug temporário (uuid-based) — user pode customizar depois em /painel/perfil-publico.
  const slugFallback = `vendedor-${userId.slice(0, 8)}`;
  const insertSupplier = await admin.from("suppliers").insert({
    user_id:             userId,
    cnpj:                row.cnpj,
    company_name:        full_name,
    trade_name:          full_name,
    slug:                slugFallback,
    phone:               null,
    address:             null,
    city:                null,
    state:               null,
    cnpj_status:         "ativa",
    is_verified:         true,
    subscription_status: "inactive", // admin ativa trial separadamente em /admin
  });

  if (insertSupplier.error) {
    // Cleanup: deleta o auth user pra não deixar conta órfã.
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    console.error("[supplier-signup] insert supplier failed:", insertSupplier.error);
    if (insertSupplier.error.code === "23505") {
      return { ok: false, message: "Esse CNPJ já está cadastrado em outra conta." };
    }
    return { ok: false, message: "Não foi possível criar o perfil de vendedor." };
  }

  // Marca token como usado (uso único).
  await admin
    .from("waitlist")
    .update({ approval_token_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return { ok: true };
}
