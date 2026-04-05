import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const url  = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Client anônimo — usado com JWT do usuário (RLS ativo) */
export function createClient(accessToken?: string) {
  const client = createSupabaseClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (accessToken) {
    // Injeta o JWT do usuário para que o RLS funcione corretamente
    client.realtime.setAuth(accessToken);
    return createSupabaseClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    });
  }

  return client;
}

/** Admin client — usa service role, bypassa RLS. Usar apenas em operações privilegiadas. */
export function createAdminClient() {
  return createSupabaseClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Valida um JWT do Supabase e retorna o usuário */
export async function getUserFromToken(token: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error) {
    console.error("Auth Error:", error.message);
    return null;
  }
  if (!data.user) return null;
  return data.user;
}
