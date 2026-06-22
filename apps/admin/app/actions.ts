"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase-admin";
import { createAdminSession, deleteAdminSession, verifyAdminSession } from "@/lib/session";
import {
  ACCOUNT_STATUS_ACTIVE,
  ACCOUNT_STATUS_SUSPENDED,
  isMissingAccountStatusColumnError,
} from "@/lib/account-status";

// ─── Auth ─────────────────────────────────────────────────────────

const AdminLoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type AdminLoginActionState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function adminLogin(
  _prev: AdminLoginActionState | undefined,
  formData: FormData
): Promise<AdminLoginActionState> {
  const parsed = AdminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

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
  redirect("/");
}

export async function adminLogout() {
  await deleteAdminSession();
  redirect("/login");
}

// ─── Suspend / Reactivate ────────────────────────────────────────

async function assertSession() {
  const ok = await verifyAdminSession();
  if (!ok) throw new Error("Sessão administrativa inválida.");
}

async function syncSuspensionByUserId(userId: string, suspend: boolean) {
  const adminClient = createAdminClient();

  const { error: profileUpdateError } = await adminClient
    .from("user_profiles")
    .update({ status: suspend ? ACCOUNT_STATUS_SUSPENDED : ACCOUNT_STATUS_ACTIVE })
    .eq("id", userId);

  const missingStatusColumn = isMissingAccountStatusColumnError(profileUpdateError?.message);
  if (profileUpdateError && !missingStatusColumn) {
    return { error: profileUpdateError.message };
  }

  const { data: supplier, error: supplierLookupError } = await adminClient
    .from("suppliers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();

  if (supplierLookupError) return { error: supplierLookupError.message };

  if (supplier?.id) {
    const { error: supplierUpdateError } = await adminClient
      .from("suppliers")
      .update({ suspended: suspend })
      .eq("id", supplier.id);

    if (supplierUpdateError) return { error: supplierUpdateError.message };
  }

  if (missingStatusColumn && !supplier?.id) {
    return {
      error:
        "Não foi possível suspender este usuário sem a migration do campo user_profiles.status.",
    };
  }

  return {};
}

export async function toggleSuspendSupplier(
  supplierId: string,
  suspend: boolean
): Promise<{ error?: string }> {
  try {
    await assertSession();
    const adminClient = createAdminClient();

    const { data: supplier, error } = await adminClient
      .from("suppliers")
      .select("id, user_id")
      .eq("id", supplierId)
      .maybeSingle<{ id: string; user_id: string }>();

    if (error) return { error: error.message };
    if (!supplier?.user_id) return { error: "Fornecedor não encontrado." };

    const result = await syncSuspensionByUserId(supplier.user_id, suspend);
    if (result.error) return result;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro desconhecido." };
  }

  revalidatePath("/usuarios");
  revalidatePath("/");
  return {};
}

export async function toggleSuspendUser(
  userId: string,
  suspend: boolean
): Promise<{ error?: string }> {
  try {
    await assertSession();

    const adminClient = createAdminClient();
    const { data: profile, error } = await adminClient
      .from("user_profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle<{ id: string }>();

    if (error) return { error: error.message };
    if (!profile?.id) return { error: "Usuário não encontrado." };

    const result = await syncSuspensionByUserId(userId, suspend);
    if (result.error) return result;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro desconhecido." };
  }

  revalidatePath("/usuarios");
  revalidatePath("/");
  return {};
}

// ─── Trial 7 dias (decisão de produto 2026-05-14) ────────────────────────────

const TRIAL_DAYS = 7;

export async function activateSupplierTrial(
  supplierId: string
): Promise<{ error?: string }> {
  try {
    await assertSession();
    const adminClient = createAdminClient();

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const { error } = await adminClient
      .from("suppliers")
      .update({
        subscription_status: "trialing",
        subscription_started_at: startedAt.toISOString(),
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq("id", supplierId);

    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro desconhecido." };
  }

  revalidatePath("/usuarios");
  return {};
}

// ─── Waitlist: aprovação manual (decisão 2026-05-14, opção A2) ──────────────

export async function approveWaitlistEntry(
  waitlistId: string
): Promise<{ error?: string }> {
  try {
    await assertSession();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("waitlist")
      .update({ approved_at: new Date().toISOString() })
      .eq("id", waitlistId)
      .is("approved_at", null);

    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro desconhecido." };
  }

  revalidatePath("/waitlist");
  return {};
}

export async function notifyWaitlistEntry(
  waitlistId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    await assertSession();

    const webAppUrl = process.env.WEB_APP_URL;
    const adminSecret = process.env.ADMIN_API_SECRET;

    if (!webAppUrl || !adminSecret) {
      return {
        ok: false,
        message: "Configuração de servidor incompleta (WEB_APP_URL / ADMIN_API_SECRET).",
      };
    }

    const res = await fetch(
      `${webAppUrl}/api/admin/waitlist/${waitlistId}/notify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        cache: "no-store",
      },
    );

    const json = (await res.json().catch(() => ({
      ok: false,
      message: `Erro HTTP ${res.status}`,
    }))) as { ok: boolean; message: string };

    return json;
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro desconhecido ao notificar vendedor.",
    };
  }
}

export async function unapproveWaitlistEntry(
  waitlistId: string
): Promise<{ error?: string }> {
  try {
    await assertSession();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("waitlist")
      .update({ approved_at: null })
      .eq("id", waitlistId);

    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro desconhecido." };
  }

  revalidatePath("/waitlist");
  return {};
}

export async function deactivateSupplierSubscription(
  supplierId: string
): Promise<{ error?: string }> {
  try {
    await assertSession();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("suppliers")
      .update({
        subscription_status: "inactive",
        subscription_started_at: null,
        subscription_expires_at: null,
      })
      .eq("id", supplierId);

    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro desconhecido." };
  }

  revalidatePath("/usuarios");
  return {};
}
