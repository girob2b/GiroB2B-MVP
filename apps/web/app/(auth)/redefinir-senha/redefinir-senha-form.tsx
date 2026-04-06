"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, Eye, EyeOff,
  KeyRound, Loader2, ShieldAlert, ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "checking" | "ready" | "submitting" | "done" | "invalid" | "error";

/**
 * Cobre três cenários de sessão de recuperação:
 *
 * 1. PKCE  — O callback server-side trocou o código e setou o cookie.
 *            getUser() retorna o usuário diretamente.
 *
 * 2. PKCE direto — O link do email aponta para /redefinir-senha?code=XXX.
 *            Trocamos o código no browser.
 *
 * 3. Implicit / hash — Supabase usou #access_token=...&type=recovery.
 *            O browser client detecta o hash e dispara PASSWORD_RECOVERY.
 */
export default function RedefinirSenhaForm() {
  const searchParams = useSearchParams();

  const [status,              setStatus]              = useState<Status>("checking");
  const [password,            setPassword]            = useState("");
  const [confirmPassword,     setConfirmPassword]     = useState("");
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage,        setErrorMessage]        = useState("");

  // Garante que só marcamos "ready" uma vez (evita race conditions)
  const readyRef = useRef(false);
  function markReady() {
    if (readyRef.current) return;
    readyRef.current = true;
    setStatus("ready");
  }

  // ── Detecta sessão de recuperação ─────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    // Listener para implicit flow (hash fragment) e para PKCE tardio.
    // Dispara PASSWORD_RECOVERY quando o browser client detecta o hash
    // ou SIGNED_IN quando a sessão já está estabelecida.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        markReady();
      }
    });

    async function tryEstablishSession() {
      // Caso 1 — existe um ?code= na URL (PKCE apontado direto pra cá)
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) { markReady(); return; }
      }

      // Caso 2 — sessão já existe no cookie (veio pelo callback server-side)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { markReady(); return; }

      // Caso 3 — aguardar o evento onAuthStateChange (implicit / hash flow)
      // Se não vier em 5 s, mostramos "link inválido"
      const timer = setTimeout(() => {
        setStatus(s => s === "checking" ? "invalid" : s);
      }, 5000);

      return () => clearTimeout(timer);
    }

    const cleanupPromise = tryEstablishSession();

    return () => {
      subscription.unsubscribe();
      cleanupPromise.then(fn => fn?.());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password.length < 8) {
      setErrorMessage("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage("Não foi possível atualizar sua senha. Tente solicitar um novo link.");
      setStatus("error");
      return;
    }

    // Encerra a sessão de recuperação antes de redirecionar
    await supabase.auth.signOut({ scope: "local" });
    setStatus("done");
  }

  // ── Estados de UI ─────────────────────────────────────────────────────────

  if (status === "checking") {
    return (
      <Card className="w-full max-w-md shadow-xl border border-emerald-100">
        <CardContent className="pt-10 pb-8 text-center space-y-4">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
          <p className="text-sm text-muted-foreground">Validando seu link de recuperação…</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "invalid") {
    return (
      <Card className="w-full max-w-md shadow-xl border border-amber-200">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert className="h-7 w-7 text-amber-700" />
          </div>
          <CardTitle className="text-2xl font-bold">Link indisponível</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            Esse link de recuperação expirou, já foi usado ou não foi reconhecido.
            Solicite um novo para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button render={<Link href="/recuperar-senha" />} className="w-full bg-emerald-500 hover:bg-emerald-600">
            Solicitar novo link
          </Button>
          <Button render={<Link href="/login" />} variant="outline" className="w-full">
            Voltar ao login
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "done") {
    return (
      <Card className="w-full max-w-md shadow-xl border border-emerald-100">
        <CardContent className="pt-10 pb-8 text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <ShieldCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Senha atualizada!</h2>
            <p className="text-muted-foreground leading-relaxed">
              Sua nova senha foi salva com sucesso. Faça login para continuar.
            </p>
          </div>
          <Button render={<Link href="/login" />} className="w-full bg-emerald-500 hover:bg-emerald-600">
            Fazer login
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Formulário (ready | submitting | error) ───────────────────────────────
  return (
    <Card className="w-full max-w-md shadow-xl border border-emerald-100">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-bold">Definir nova senha</CardTitle>
        <CardDescription>
          Escolha uma senha forte para voltar a acessar sua conta.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Nova senha */}
          <div className="space-y-2">
            <Label htmlFor="new-password" className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Nova senha
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo de 8 caracteres"
                autoComplete="new-password"
                className="h-12 pr-12"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Indicador de força */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(level => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        passwordStrength(password) >= level
                          ? level <= 1 ? "bg-red-400"
                            : level <= 2 ? "bg-amber-400"
                            : level <= 3 ? "bg-yellow-400"
                            : "bg-emerald-500"
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {strengthLabel(passwordStrength(password))}
                </p>
              </div>
            )}
          </div>

          {/* Confirmar senha */}
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
            <div className="relative">
              <Input
                id="confirm-new-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                className={`h-12 pr-12 ${
                  confirmPassword && confirmPassword !== password
                    ? "border-destructive focus-visible:ring-destructive/30"
                    : ""
                }`}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
              {/* Inline match indicator */}
              {confirmPassword.length >= 8 && confirmPassword === password && (
                <CheckCircle2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
              )}
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-destructive">As senhas não coincidem.</p>
            )}
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Use letras, números e símbolos. Evite senhas já usadas em outros serviços.
          </div>

          {errorMessage && (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <p className="text-sm font-medium text-destructive">{errorMessage}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 bg-[linear-gradient(135deg,var(--brand-green-600)_0%,var(--brand-green-700)_100%)] text-white hover:opacity-90"
            disabled={status === "submitting" || (confirmPassword.length > 0 && confirmPassword !== password)}
          >
            {status === "submitting" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Atualizando senha…
              </span>
            ) : (
              "Salvar nova senha"
            )}
          </Button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar ao login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function passwordStrength(pwd: string): number {
  let score = 0;
  if (pwd.length >= 8)                        score++;
  if (pwd.length >= 12)                       score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd))                          score++;
  if (/[^A-Za-z0-9]/.test(pwd))               score++;
  return Math.min(score, 4);
}

function strengthLabel(score: number): string {
  return ["", "Muito fraca", "Fraca", "Boa", "Forte"][score] ?? "";
}
