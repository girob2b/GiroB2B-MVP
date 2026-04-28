import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureMinimalProfile } from "@/lib/auth/ensure-profile";

/**
 * Supabase redireciona para cá após:
 *   1. PKCE flow  → ?code=XXX         (padrão em projetos novos)
 *   2. Email OTP  → ?token_hash=XXX   (magic link / recovery em alguns projetos)
 *
 * Implicit flow (hash fragment) NÃO chega aqui — o hash nunca é enviado ao servidor.
 * Nesse caso, o cliente browser do Supabase detecta o hash automaticamente e
 * dispara o evento PASSWORD_RECOVERY. Esse caso é tratado no redefinir-senha-form.tsx.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const type        = searchParams.get("type") as "recovery" | "signup" | "magiclink" | "invite" | null;
  const defaultNext = type === "recovery" ? "/redefinir-senha" : "/painel/explorar";
  const rawNext     = searchParams.get("next") ?? defaultNext;
  const next        = rawNext.startsWith("/") ? rawNext : defaultNext;

  const supabase = await createClient();

  // ── PKCE flow ────────────────────────────────────────────────────────────
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type !== "recovery") await ensureMinimalProfile(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // ── Email OTP / magic link flow ──────────────────────────────────────────
  const token_hash = searchParams.get("token_hash");
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      if (type !== "recovery") await ensureMinimalProfile(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // ── Fallback ─────────────────────────────────────────────────────────────
  return NextResponse.redirect(`${origin}/login?error=link_expirado`);
}
