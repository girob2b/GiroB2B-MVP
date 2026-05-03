import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuspendedAccountStatus } from "@/lib/auth/account-status";

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
  { error: "Token de autenticacao ausente." },
  { status: 401 }
);
const AUTH_INVALID = NextResponse.json(
  { error: "Token invalido ou expirado." },
  { status: 401 }
);
const AUTH_SUSPENDED = NextResponse.json({ error: "Conta suspensa." }, { status: 403 });

async function isSuspendedUser(supabase: SupabaseClient, userId: string) {
  const [{ data: profile }, { data: supplier }] = await Promise.all([
    supabase.from("user_profiles").select("status").eq("id", userId).maybeSingle(),
    supabase.from("suppliers").select("suspended").eq("user_id", userId).maybeSingle(),
  ]);

  return isSuspendedAccountStatus(profile?.status, Boolean(supplier?.suspended));
}

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

    if (await isSuspendedUser(supabase, data.user.id)) {
      return { user: null, response: AUTH_SUSPENDED };
    }

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
            // Server Components nao podem setar cookie.
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { user: null, response: AUTH_INVALID };
  }

  if (await isSuspendedUser(supabase, data.user.id)) {
    return { user: null, response: AUTH_SUSPENDED };
  }

  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token ?? "";

  return { user: data.user, supabase, accessToken };
}
