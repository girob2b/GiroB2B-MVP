"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LOGIN_REDIRECT = "/login?status=email_confirmado";

function getSignupRedirectUrl() {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(LOGIN_REDIRECT)}`;
}

export default function BuyerRegisterForm() {
  const [step, setStep] = useState<"form" | "verify" | "success">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    if (!email.trim()) {
      setFormError("Informe um email válido para continuar.");
      setSubmitting(false);
      return;
    }
    if (password.length < 8) {
      setFormError("A senha precisa ter pelo menos 8 caracteres.");
      setSubmitting(false);
      return;
    }
    if (password !== confirmPassword) {
      setFormError("As senhas não coincidem. Confira a confirmação.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: getSignupRedirectUrl() },
    });

    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "Este email já está cadastrado. Faça login para continuar."
          : "Não foi possível criar sua conta agora. Tente novamente em instantes."
      );
      setSubmitting(false);
      return;
    }

    if (data.session) {
      await supabase.auth.signOut({ scope: "local" });
      setStep("success");
      toast.success("Conta criada! Agora você já pode entrar.");
      setSubmitting(false);
      return;
    }

    setStep("verify");
    toast.success("Código enviado! Verifique seu email.");
    setSubmitting(false);
  }

  async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const token = verificationCode.join("");
    if (token.length !== 6) {
      toast.error("Digite os 6 dígitos do código de verificação.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });

    if (error) {
      toast.error("Código inválido ou expirado. Solicite um novo envio.");
      setSubmitting(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    setStep("success");
    toast.success("Email verificado! Faça login para continuar.");
    setSubmitting(false);
  }

  async function handleResendCode() {
    setResending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: getSignupRedirectUrl() },
    });

    if (error) {
      toast.error("Não foi possível reenviar o código. Tente novamente.");
      setResending(false);
      return;
    }

    toast.success("Novo código enviado para o seu email.");
    setResending(false);
  }

  function handleCodeChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextCode = [...verificationCode];
    nextCode[index] = digit;
    setVerificationCode(nextCode);

    if (digit && index < codeInputRefs.current.length - 1) {
      codeInputRefs.current[index + 1]?.focus();
    }
  }

  function handleCodeKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (!pastedDigits) return;

    const nextCode = ["", "", "", "", "", ""];
    pastedDigits.split("").forEach((digit, index) => {
      nextCode[index] = digit;
    });
    setVerificationCode(nextCode);

    const nextFocusIndex = Math.min(pastedDigits.length, 5);
    codeInputRefs.current[nextFocusIndex]?.focus();
  }

  if (step === "success") {
    return (
      <Card className="w-full max-w-lg border border-[color:var(--brand-green-100)] shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--brand-green-100)]">
            <CheckCircle2 className="h-6 w-6 text-[color:var(--brand-green-600)]" />
          </div>
          <CardTitle className="text-xl font-semibold">Cadastro concluído</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Entre com seu email e senha para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Button
            render={<Link href="/login?status=cadastro_concluido" />}
            size="lg"
            className="h-12 w-full bg-[linear-gradient(135deg,var(--brand-green-700)_0%,var(--brand-green-800)_100%)] text-base font-semibold text-white hover:opacity-95"
          >
            Ir para o login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg border border-[color:var(--brand-green-100)] shadow-xl">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-semibold">
          {step === "form" ? "Criar conta" : "Confirme seu email"}
        </CardTitle>
        <CardDescription className="text-sm">
          {step === "form"
            ? "Preencha os dados abaixo para começar."
            : "Digite o código de 6 dígitos enviado para o seu email."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {step === "form" ? (
          <form onSubmit={handleRegister} className="space-y-5">
            <section className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[color:var(--brand-green-700)]" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="você@empresa.com"
                  autoComplete="email"
                  className="h-11 border-slate-200 focus-visible:border-[color:var(--brand-green-700)] focus-visible:ring-[color:var(--brand-green-100)]"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[color:var(--brand-green-700)]" />
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo de 8 caracteres"
                    autoComplete="new-password"
                    className="h-11 border-slate-200 pr-12 focus-visible:border-[color:var(--brand-green-700)] focus-visible:ring-[color:var(--brand-green-100)]"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((currentValue) => !currentValue)}
                    className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    className="h-11 border-slate-200 pr-12 focus-visible:border-[color:var(--brand-green-700)] focus-visible:ring-[color:var(--brand-green-100)]"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((currentValue) => !currentValue)}
                    className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </section>

            <div className="rounded-xl border border-[color:var(--brand-green-100)] bg-[color:var(--brand-green-50)] p-4 text-sm text-[color:var(--brand-green-900)]">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--brand-green-700)]" />
                <p>
                  Ao continuar, enviaremos um código de confirmação para validar seu email antes do primeiro login.
                </p>
              </div>
            </div>

            {formError && <div className="alert-error text-xs">{formError}</div>}

            <Button
              type="submit"
              size="lg"
              className="btn-primary h-12 w-full text-base"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando conta...
                </span>
              ) : (
                "Enviar código de verificação"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <section className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Código enviado para</p>
                <p className="text-sm text-muted-foreground break-all">{email}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification-code-0">Código de 6 dígitos</Label>
                <div className="grid grid-cols-6 gap-2">
                  {verificationCode.map((digit, index) => (
                    <Input
                      key={index}
                      id={`verification-code-${index}`}
                      ref={(element) => {
                        codeInputRefs.current[index] = element;
                      }}
                      aria-label={`Dígito ${index + 1} de 6`}
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      className="h-12 border-slate-200 text-center text-lg font-semibold focus-visible:border-[color:var(--brand-green-700)] focus-visible:ring-[color:var(--brand-green-100)]"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleCodeChange(index, event.target.value)}
                      onKeyDown={(event) => handleCodeKeyDown(index, event)}
                      onPaste={handleCodePaste}
                    />
                  ))}
                </div>
              </div>
            </section>

            <Button
              type="submit"
              size="lg"
              className="btn-primary h-12 w-full text-base"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validando código...
                </span>
              ) : (
                "Concluir cadastro"
              )}
            </Button>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-[color:var(--brand-green-200)] text-[color:var(--brand-green-700)] hover:bg-[color:var(--brand-green-50)]"
                disabled={resending}
                onClick={handleResendCode}
              >
                <RefreshCw className={resending ? "animate-spin" : undefined} />
                {resending ? "Reenviando..." : "Reenviar código"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="flex-1 text-[color:var(--brand-green-700)] hover:bg-[color:var(--brand-green-50)]"
                onClick={() => {
                  setStep("form");
                  setVerificationCode(["", "", "", "", "", ""]);
                }}
              >
                <ArrowLeft />
                Voltar
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3 text-center text-sm text-muted-foreground">
          <p>
            Já tem conta?{" "}
            <Link
              href="/login"
              className="font-semibold text-[color:var(--brand-green-700)] hover:underline underline-offset-4"
            >
              Fazer login
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
