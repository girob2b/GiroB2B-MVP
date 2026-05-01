import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;
type ProfileRole = "user" | "buyer" | "supplier" | "admin";

export async function syncDerivedUserRoleWithAdmin(
  admin: AdminClient,
  userId: string
): Promise<ProfileRole> {
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: ProfileRole }>();

  if (profileError) throw new Error("Nao foi possivel sincronizar o papel do usuario.");

  const { data: supplier, error: supplierError } = await admin
    .from("suppliers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();

  if (supplierError) throw new Error("Nao foi possivel sincronizar o papel do usuario.");

  const { data: buyer, error: buyerError } = await admin
    .from("buyers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();

  if (buyerError) throw new Error("Nao foi possivel sincronizar o papel do usuario.");

  const nextRole: ProfileRole =
    profile?.role === "admin" ? "admin" : supplier ? "supplier" : buyer ? "buyer" : "user";

  const { error: updateProfileError } = await admin
    .from("user_profiles")
    .update({ role: nextRole })
    .eq("id", userId);

  if (updateProfileError) throw new Error("Nao foi possivel sincronizar o papel do usuario.");

  const userResult = await admin.auth.admin.getUserById(userId);
  if (userResult.error) throw new Error("Nao foi possivel sincronizar o papel do usuario.");

  const currentMetadata = (userResult.data.user?.user_metadata ?? {}) as Record<string, unknown>;
  const nextMetadata: Record<string, unknown> = {
    ...currentMetadata,
    role: nextRole,
  };
  delete nextMetadata.segment;

  const metadataResult = await admin.auth.admin.updateUserById(userId, {
    user_metadata: nextMetadata,
  });

  if (metadataResult.error) throw new Error("Nao foi possivel sincronizar o papel do usuario.");

  return nextRole;
}
