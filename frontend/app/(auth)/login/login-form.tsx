"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const REMEMBER_EMAIL_KEY = "girob2b.remembered-email";

export type LoginFeedback = {
  kind: "success" | "error";
  message: string;
};

type LoginFormProps = {
  feedback?: LoginFeedback;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-.8 2.3-1.8 3.1l3 2.3c1.8-1.6 2.8-4 2.8-6.9 0-.7-.1-1.4-.2-2H12Z"
      />
      <path
        fill="#34A853"
        d="M12 21c2.5 0 4.6-.8 6.1-2.3l-3-2.3c-.8.6-1.9 1-3.2 1-2.4 0-4.5-1.7-5.2-4H3.6v2.4A9.2 9.2 0 0 0 12 21Z"
      />
      <path
        fill="#4A90E2"
        d="M6.8 13.4a5.6 5.6 0 0 1 0-3.5V7.5H3.6a9.1 9.1 0 0 0 0 8.2l3.2-2.3Z"
      />
      <path
        fill="#FBBC05"
        d="M12 6.6c1.4 0 2.7.5 3.7 1.4l2.8-2.8A9.3 9.3 0 0 0 3.6 7.5l3.2 2.4c.7-2.3 2.8-3.9 5.2-3.9Z"
      />
    </svg>
  );
}

export default function LoginForm({ feedback }: LoginFormProps) {
  const [state, action, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [oauthPending, setOauthPending] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (!savedEmail) return;

    const frame = window.requestAnimationFrame(() => {
      setEmail(savedEmail);
      setRememberMe(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function handleGoogleLogin() {
    setOauthPending(true);
    setOauthError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/painel")}`,
      },
    });

    if (error) {
      setOauthError(
        "Nao foi possivel iniciar o login com Google. Verifique se o provedor esta configurado no Supabase."
      );
      setOauthPending(false);
    }
  }

  function handleSubmit() {
    if (rememberMe && email.trim()) {
      window.localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      return;
    }

    window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-7">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand-green-500)_0%,var(--brand-green-600)_100%)] text-lg font-semibold text-white shadow-[0_16px_35px_rgba(18,199,104,0.28)]">
          G
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight text-slate-950">GiroB2B</p>
          <p className="text-sm text-slate-500">Acesso da plataforma</p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--brand-green-700)]">
              Login
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-[3.35rem]">
              Bem-vindo de volta
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-slate-500 sm:text-base">
              Entre com seu email e senha para acessar o painel da sua empresa.
            </p>
          </div>
        </div>

        <form action={action} onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="empresa@dominio.com"
              autoComplete="email"
              className="h-12 rounded-2xl border-slate-200 bg-white px-4 text-base shadow-none focus-visible:border-[color:var(--brand-green-500)] focus-visible:ring-[color:var(--brand-green-100)]"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {state?.errors?.email && (
              <p className="text-sm text-destructive">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              <span className="flex items-center gap-2">
                <LockKeyhole className="w-4 h-4" />
                Senha
              </span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                className="h-12 rounded-2xl border-slate-200 bg-white px-4 pr-12 text-base shadow-none focus-visible:border-[color:var(--brand-green-500)] focus-visible:ring-[color:var(--brand-green-100)]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {state?.errors?.password && (
              <p className="text-sm text-destructive">{state.errors.password[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor="remember-me" className="flex items-center gap-3 text-sm font-medium text-slate-600">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
              />
              Lembrar meu usuario
            </label>
            <Link
              href="/recuperar-senha"
              className="text-sm font-medium text-[color:var(--brand-green-700)] transition-colors hover:text-[color:var(--brand-green-600)]"
            >
              Esqueceu sua senha?
            </Link>
          </div>

          {feedback && (
            <div
              role="status"
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                feedback.kind === "success"
                  ? "border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)]"
                  : "border border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {state?.message && (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <p className="text-sm font-medium text-destructive">{state.message}</p>
            </div>
          )}

          {oauthError && (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <p className="text-sm font-medium text-destructive">{oauthError}</p>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,var(--brand-green-500)_0%,var(--brand-green-600)_100%)] text-base font-semibold text-white shadow-[0_18px_40px_rgba(18,199,104,0.22)] hover:opacity-95"
            disabled={pending}
          >
            {pending ? "Entrando..." : "Entrar"}
          </Button>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                ou entre com
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 w-full rounded-2xl border-slate-200 bg-white text-base font-semibold text-slate-700 hover:bg-slate-50"
              onClick={handleGoogleLogin}
              disabled={oauthPending}
            >
              <GoogleIcon />
              {oauthPending ? "Conectando ao Google..." : "Entrar com Google"}
            </Button>
          </div>
        </form>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              criar conta
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Link
            href="/cadastro"
            className="flex min-h-14 flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-[color:var(--brand-green-200)] hover:bg-[color:var(--brand-green-50)]"
          >
            <span className="text-sm font-semibold text-slate-950">Criar conta gratuita</span>
            <span className="mt-1 text-xs leading-relaxed text-slate-500">
              Comprador, fornecedor ou ambos — você escolhe após o cadastro.
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
