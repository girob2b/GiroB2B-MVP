"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
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

function getSignupRedirectUrl() {
  // Após confirmar o email, o callback cria sessão e redireciona.
  // Sem `next`, o callback usa /painel — middleware leva pra /onboarding se incompleto.
  return `${window.location.origin}/auth/callback`;
}

type Step = "form" | "email_sent";

export default function BuyerRegisterForm() {
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    if (!termsAccepted) {
      setFormError("Para criar a conta, você precisa aceitar os Termos de Uso e a Política de Privacidade.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: getSignupRedirectUrl(),
        // Guarda a hora exata do aceite no user_metadata.
        // Auditável em qualquer fluxo posterior (LGPD Art. 8º — consentimento livre, informado e inequívoco).
        data: { terms_accepted_at: new Date().toISOString() },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      // Loga o erro real no console pra debug — sem expor pra UX
      console.error("[buyer-register-form] signUp error:", error);
      if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already registered")) {
        setFormError("Este email já está cadastrado. Faça login para continuar.");
      } else if (msg.includes("rate limit") || msg.includes("too many") || msg.includes("over_email_send_rate_limit")) {
        setFormError("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.");
      } else if (msg.includes("invalid") && msg.includes("email")) {
        setFormError("Endereço de email inválido. Confira a digitação.");
      } else {
        setFormError(`Não foi possível criar sua conta agora: ${error.message}`);
      }
      setSubmitting(false);
      return;
    }

    // Confirmação por email desabilitada no Supabase (raro): cria sessão direto
    if (data.session) {
      await supabase.auth.signOut({ scope: "local" });
      toast.success("Conta criada! Faça login para continuar.");
      setSubmitting(false);
      window.location.href = "/login?status=cadastro_concluido";
      return;
    }

    // Detecção de email já existente: por segurança anti-enumeration, o Supabase
    // NÃO retorna erro pra email duplicado, mas devolve um user com identities=[].
    // Sem isso, o usuário caía em "Verifique seu email" e ficava esperando email
    // que nunca chega (porque a conta já estava confirmada antes).
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setFormError("Este email já está cadastrado. Faça login para continuar.");
      setSubmitting(false);
      return;
    }

    // Caminho padrão: confirmação por email com link
    setStep("email_sent");
    setSubmitting(false);
  }

  async function handleResendEmail() {
    setResending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: getSignupRedirectUrl() },
    });

    if (error) {
      console.error("[buyer-register-form] resend error:", error);
      const status = (error as { status?: number }).status;
      const msg = error.message.toLowerCase();
      if (status === 429 || msg.includes("rate limit") || msg.includes("over_email_send")) {
        toast.error("Limite de envios atingido. Aguarde alguns minutos antes de tentar de novo.");
      } else {
        toast.error("Não foi possível reenviar o email. Tente novamente em instantes.");
      }
      setResending(false);
      return;
    }

    toast.success("Novo link enviado para o seu email.");
    setResending(false);
  }

  // ── Estado: email enviado ────────────────────────────────────────────────
  if (step === "email_sent") {
    return (
      <div className="flex w-full flex-col gap-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
          <Mail className="h-7 w-7 text-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-900">
            Verifique seu email
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enviamos um link de confirmação para
          </p>
          <p className="text-sm font-semibold text-slate-900 break-all">{email}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Clique no link da mensagem para ativar sua conta. Você cairá automaticamente no login.
          </p>
        </div>

        <div className="alert-info text-xs text-left">
          Não recebeu? Verifique a caixa de spam. O link expira em alguns minutos por segurança.
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={resending}
            onClick={handleResendEmail}
          >
            {resending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {resending ? "Reenviando..." : "Reenviar email"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep("form")}
            className="text-brand-700 hover:bg-brand-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Trocar email
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Já confirmou?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-700 hover:text-brand-800 hover:underline underline-offset-4"
          >
            Fazer login
          </Link>
        </p>
      </div>
    );
  }

  // ── Estado: form de cadastro ─────────────────────────────────────────────
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Criar conta</h1>
        <p className="text-sm text-muted-foreground">
          Preencha os dados abaixo para começar.
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-5">
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-foreground" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="você@empresa.com"
              autoComplete="email"
              className="h-11 bg-white border-slate-200 focus-visible:border-brand-700 focus-visible:ring-brand-100"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-foreground" />
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo de 8 caracteres"
                autoComplete="new-password"
                className="h-11 bg-white border-slate-200 pr-12 focus-visible:border-brand-700 focus-visible:ring-brand-100"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar senha</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repita a senha"
                autoComplete="new-password"
                className="h-11 bg-white border-slate-200 pr-12 focus-visible:border-brand-700 focus-visible:ring-brand-100"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
            <p>
              Ao continuar, enviaremos um link de confirmação para validar seu email antes do primeiro login.
            </p>
          </div>
        </div>

        <label
          htmlFor="terms-accept"
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 cursor-pointer hover:border-brand-300 transition-colors"
        >
          <input
            id="terms-accept"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-brand-700 focus:ring-2 focus:ring-brand-500"
          />
          <span className="leading-relaxed">
            Li e aceito os{" "}
            <Link href="/termos" target="_blank" className="font-semibold text-brand-700 hover:underline">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className="font-semibold text-brand-700 hover:underline">
              Política de Privacidade
            </Link>
            , autorizando o tratamento dos meus dados conforme a LGPD.
          </span>
        </label>

        {formError && <div className="alert-error text-xs">{formError}</div>}

        <Button
          type="submit"
          size="lg"
          className="btn-primary h-12 w-full text-base"
          disabled={submitting || !termsAccepted}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Criando conta...
            </span>
          ) : (
            "Criar conta"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-700 hover:text-brand-800 hover:underline underline-offset-4"
        >
          Fazer login
        </Link>
      </p>
    </div>
  );
}
