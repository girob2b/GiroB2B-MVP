import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Helper de autenticação para Route Handlers e Server Actions.
 *
 * Estratégia híbrida (definida na Fase 0 da migração Fastify → Next):
 *  - **Cookie SSR primeiro** (idiomático Next.js + Supabase): chamadas de
 *    Server Components/Actions e do browser que mantêm a sessão via cookie
 *    httpOnly, gerenciada pelo `@supabase/ssr`.
 *  - **Bearer token como fallback**: chamadas Server-to-Server, integrações
 *    e componentes Client que ainda passam `Authorization: Bearer <token>`
 *    explicitamente (ex.: `apiClient` legado durante a migração).
 *
 * Retorna `{ user, supabase, accessToken }` quando autenticado, ou
 * `{ user: null, response }` com `NextResponse.json(401)` pronto para retornar.
 *
 * Uso típico em route handler:
 *   const auth = await requireAuth(request);
 *   if (!auth.user) return auth.response;
 *   const { user, supabase } = auth;
 *
 * O `supabase` retornado já tem o JWT do usuário aplicado — RLS funciona
 * normalmente. Se precisar de service_role, importe `createAdminClient`
 * diretamente em vez de usar o `supabase` deste helper.
 */

import { NextResponse } from "next/server";

type AuthOk = {
  user: User;
  supabase: SupabaseClient;
  accessToken: string;
  response?: never;
};

type AuthErr = {
  user: null;
  supabase?: never;
  accessToken?: never;
  response: NextResponse;
};

export type AuthResult = AuthOk | AuthErr;

const AUTH_MISSING = NextResponse.json(
  { error: "Token de autenticação ausente." },
  { status: 401 }
);

const AUTH_INVALID = NextResponse.json(
  { error: "Token inválido ou expirado." },
  { status: 401 }
);

export async function requireAuth(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (!token) return { user: null, response: AUTH_MISSING };

    const admin = createAdminClient();
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) {
      return { user: null, response: AUTH_INVALID };
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
    const supabase = createSupabaseClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    return { user: data.user, supabase, accessToken: token };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components não podem setar cookie — ignorar.
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { user: null, response: AUTH_INVALID };
  }

  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token ?? "";

  return { user: data.user, supabase, accessToken };
}
