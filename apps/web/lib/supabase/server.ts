import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Nota: os tipos são gerados pelo Supabase CLI após conectar ao banco.
// Para o MVP, usamos cliente sem generic para evitar conflitos de tipo.

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
            // Em Server Components, set é ignorado (proxy já resolveu)
          }
        },
      },
    }
  );
}
