import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role.
 *
 * Bypassa RLS — usar APENAS em Route Handlers, Server Actions e código que
 * roda exclusivamente no servidor. O `import "server-only"` faz o build do
 * Next.js falhar se este módulo for importado (direta ou transitivamente)
 * por um Client Component.
 *
 * Casos válidos: operações que precisam atualizar `auth.users`, ler dados de
 * outro usuário em fluxo administrativo, mascarar PII por plano, ou
 * resolver políticas que o RLS não cobre.
 *
 * Para a maioria das leituras autenticadas, prefira `createClient()` em
 * `./server.ts` — que respeita RLS via JWT do usuário e é mais seguro.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "createAdminClient: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
