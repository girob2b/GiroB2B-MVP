"use client";

import { useRef, useState } from "react";
import Link from "next/link";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setHelperMessage(null);

    if (!email.trim()) {
      setErrorMessage("Informe um email válido para continuar.");
      setSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setErrorMessage("A senha precisa ter pelo menos 8 caracteres.");
      setSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: getSignupRedirectUrl(),
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setErrorMessage("Este email já está cadastrado. Faça login para continuar.");
      } else {
        setErrorMessage("Não foi possível criar sua conta agora. Tente novamente em instantes.");
      }
      setSubmitting(false);
      return;
    }

    if (data.session) {
      await supabase.auth.signOut({ scope: "local" });
      setStep("success");
      setHelperMessage("Conta criada com sucesso. Agora você já pode entrar.");
      setSubmitting(false);
      return;
    }

    setStep("verify");
    setHelperMessage("Enviamos um código para o seu email. Digite os 6 números para concluir.");
    setSubmitting(false);
  }

  async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    const token = verificationCode.join("");
    if (token.length !== 6) {
      setErrorMessage("Digite os 6 numeros do codigo de verificacao.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });

    if (error) {
      setErrorMessage("Codigo invalido ou expirado. Solicite um novo envio e tente novamente.");
      setSubmitting(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    setStep("success");
    setHelperMessage("Email verificado com sucesso. Agora faca login para continuar.");
    setSubmitting(false);
  }

  async function handleResendCode() {
    setResending(true);
    setErrorMessage(null);
    setHelperMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: getSignupRedirectUrl(),
      },
    });

    if (error) {
      setErrorMessage("Nao foi possivel reenviar o codigo agora. Tente novamente em instantes.");
      setResending(false);
      return;
    }

    setHelperMessage("Enviamos um novo codigo para o seu email.");
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

  function renderAlert() {
    if (errorMessage) {
      return (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium text-destructive">{errorMessage}</p>
        </div>
      );
    }

    if (helperMessage) {
      return (
        <div className="rounded-xl border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] px-4 py-3">
          <p className="text-sm font-medium text-[color:var(--brand-green-700)]">{helperMessage}</p>
        </div>
      );
    }

    return null;
  }

  if (step === "success") {
    return (
      <Card className="w-full max-w-lg border border-[color:var(--brand-green-100)] shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--brand-green-100)]">
            <CheckCircle2 className="h-8 w-8 text-[color:var(--brand-green-600)]" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[color:var(--brand-green-700)]">
            Cadastro concluido
          </p>
          <CardTitle className="text-3xl font-bold leading-tight">
            Tudo certo por aqui
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            Seu acesso inicial foi preparado. O proximo passo e entrar na plataforma com seu email e senha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {renderAlert()}
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
      <CardHeader className="space-y-2 pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand-green-700)_0%,var(--brand-green-800)_100%)] text-xl font-bold text-white">
          G
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[color:var(--brand-green-700)]">
          {step === "form" ? "Criar conta" : "Confirmar email"}
        </p>
        <CardTitle className="text-2xl font-bold leading-tight">
          {step === "form" ? "Comece com seu acesso" : "Digite o codigo enviado"}
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          {step === "form"
            ? "Nesta etapa inicial vamos cuidar do seu cadastro basico. Depois seguimos para as proximas experiencias da plataforma."
            : "Enviamos um codigo de verificacao para o email cadastrado. Se o seu provedor mostrar um botao em vez do codigo, voce tambem pode confirmar pelo link recebido."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {renderAlert()}

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
                  placeholder="voce@empresa.com"
                  autoComplete="email"
                  className="h-11 border-slate-200 focus-visible:border-[color:var(--brand-green-700)] focus-visible:ring-[color:var(--brand-green-100)]"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
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
                    placeholder="Minimo de 8 caracteres"
                    autoComplete="new-password"
                    className="h-11 border-slate-200 pr-12 focus-visible:border-[color:var(--brand-green-700)] focus-visible:ring-[color:var(--brand-green-100)]"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
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
                    required
                    minLength={8}
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
                  Ao continuar, enviaremos um codigo de confirmacao para validar seu email antes do primeiro login.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full bg-[linear-gradient(135deg,var(--brand-green-700)_0%,var(--brand-green-800)_100%)] text-base font-semibold text-white hover:opacity-95"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando conta...
                </span>
              ) : (
                "Enviar codigo de verificacao"
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
              className="h-12 w-full bg-[linear-gradient(135deg,var(--brand-green-700)_0%,var(--brand-green-800)_100%)] text-base font-semibold text-white hover:opacity-95"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validando codigo...
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
                {resending ? "Reenviando..." : "Reenviar codigo"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="flex-1 text-[color:var(--brand-green-700)] hover:bg-[color:var(--brand-green-50)]"
                onClick={() => {
                  setStep("form");
                  setVerificationCode(["", "", "", "", "", ""]);
                  setHelperMessage(null);
                  setErrorMessage(null);
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
            Ja tem conta?{" "}
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
