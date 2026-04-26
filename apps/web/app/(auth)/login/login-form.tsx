"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, FileKey, Loader2, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
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
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginForm({ feedback }: LoginFormProps) {
  const [state, action, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [oauthPending, setOauthPending] = useState(false);
  const [certPending, setCertPending] = useState(false);
  const certInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (!savedEmail) return;
    const frame = window.requestAnimationFrame(() => {
      setEmail(savedEmail);
      setRememberMe(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Feedback da server action
  useEffect(() => {
    if (state?.message) toast.error(state.message);
  }, [state]);

  // Feedback vindo de query params (ex: link expirado, senha atualizada)
  useEffect(() => {
    if (!feedback) return;
    if (feedback.kind === "success") toast.success(feedback.message);
    else toast.error(feedback.message);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogleLogin() {
    setOauthPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/painel")}`,
      },
    });
    if (error) {
      toast.error("Não foi possível iniciar o login com Google. Tente novamente.");
      setOauthPending(false);
    }
  }

  function handleCertLogin() {
    certInputRef.current?.click();
  }

  function handleCertFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCertPending(true);
    // TODO: implementar validação e autenticação via certificado A1 (.pfx/.p12)
    setCertPending(false);
    event.target.value = "";
  }

  function handleSubmit() {
    if (rememberMe && email.trim()) {
      window.localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      return;
    }
    window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Entrar</h1>
        <p className="text-sm text-muted-foreground">
          Novo por aqui?{" "}
          <Link
            href="/cadastro"
            className="font-medium text-[color:var(--brand-green-700)] hover:underline underline-offset-4"
          >
            Crie sua conta
          </Link>
        </p>
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
            onChange={(e) => setEmail(e.target.value)}
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
            Lembrar meu usuário
          </label>
          <Link
            href="/recuperar-senha"
            className="text-sm font-medium text-[color:var(--brand-green-700)] transition-colors hover:text-[color:var(--brand-green-600)]"
          >
            Esqueceu sua senha?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          className="btn-primary h-12 w-full text-base"
          disabled={pending}
        >
          {pending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</>
          ) : "Entrar"}
        </Button>

        {/* Métodos alternativos */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              ou entre com
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Google — símbolo + nome */}
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-slate-200 bg-white hover:bg-slate-50 gap-2 text-sm font-medium text-slate-700"
              onClick={handleGoogleLogin}
              disabled={oauthPending}
              aria-label="Entrar com Google"
            >
              {oauthPending
                ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                : <GoogleIcon />}
              Google
            </Button>

            {/* Certificado Digital A1 */}
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-slate-200 bg-white hover:bg-slate-50 gap-2 text-slate-700"
              onClick={handleCertLogin}
              disabled={certPending}
              aria-label="Entrar com Certificado Digital A1"
              title="Certificado Digital A1 (.pfx / .p12)"
            >
              {certPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <FileKey className="h-4 w-4 shrink-0" />}
              <span className="text-xs font-medium">Cert. A1</span>
            </Button>
          </div>

          {/* Input oculto para seleção do arquivo de certificado */}
          <input
            ref={certInputRef}
            type="file"
            accept=".pfx,.p12"
            className="hidden"
            onChange={handleCertFileSelected}
          />
        </div>
      </form>
    </div>
  );
}
