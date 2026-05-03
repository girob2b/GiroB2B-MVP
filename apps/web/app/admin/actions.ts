"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ACCOUNT_STATUS_ACTIVE,
  ACCOUNT_STATUS_SUSPENDED,
  isMissingAccountStatusColumnError,
} from "@/lib/auth/account-status";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Nao autenticado.");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") throw new Error("Acesso negado.");
  return { adminUserId: authData.user.id };
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

  if (supplierLookupError) {
    return { error: supplierLookupError.message };
  }

  if (supplier?.id) {
    const { error: supplierUpdateError } = await adminClient
      .from("suppliers")
      .update({ suspended: suspend })
      .eq("id", supplier.id);

    if (supplierUpdateError) {
      return { error: supplierUpdateError.message };
    }
  }

  if (missingStatusColumn && !supplier?.id) {
    return {
      error:
        "Nao foi possivel suspender este usuario sem a migration do campo user_profiles.status.",
    };
  }

  return {};
}

export async function toggleSuspendSupplier(
  supplierId: string,
  suspend: boolean
): Promise<{ error?: string }> {
  try {
    await assertAdmin();
    const adminClient = createAdminClient();

    const { data: supplier, error: supplierLookupError } = await adminClient
      .from("suppliers")
      .select("id, user_id")
      .eq("id", supplierId)
      .maybeSingle<{ id: string; user_id: string }>();

    if (supplierLookupError) return { error: supplierLookupError.message };
    if (!supplier?.user_id) return { error: "Fornecedor nao encontrado." };

    const result = await syncSuspensionByUserId(supplier.user_id, suspend);
    if (result.error) return result;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro desconhecido." };
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin");
  return {};
}

export async function toggleSuspendUser(
  userId: string,
  suspend: boolean
): Promise<{ error?: string }> {
  try {
    const { adminUserId } = await assertAdmin();
    if (userId === adminUserId) {
      return { error: "Voce nao pode suspender seu proprio usuario." };
    }

    const adminClient = createAdminClient();
    const { data: profile, error: profileLookupError } = await adminClient
      .from("user_profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle<{ id: string }>();

    if (profileLookupError) return { error: profileLookupError.message };
    if (!profile?.id) return { error: "Usuario nao encontrado." };

    const result = await syncSuspensionByUserId(userId, suspend);
    if (result.error) return result;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro desconhecido." };
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin");
  return {};
}
