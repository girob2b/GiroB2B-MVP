"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X, Eye, EyeOff, Mail, KeyRound, Loader2, ShieldCheck, RefreshCw, ArrowLeft, LogIn, CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  onSwitchToLogin?: () => void;
  title?: string;
  subtitle?: string;
}

type Step = "form" | "verify" | "success";

export default function RegisterModal({
  open,
  onClose,
  onSuccess,
  onSwitchToLogin,
  title = "Criar cadastro grátis",
  subtitle = "Leva menos de 1 minuto.",
}: RegisterModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [helperMsg, setHelperMsg] = useState<string | null>(null);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (open) {
      setStep("form");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirm(false);
      setCode(["", "", "", "", "", ""]);
      setSubmitting(false);
      setResending(false);
      setErrorMsg(null);
      setHelperMsg(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setHelperMsg(null);
    if (!email.trim()) return setErrorMsg("Informe um email válido.");
    if (password.length < 8) return setErrorMsg("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== confirmPassword) return setErrorMsg("As senhas não coincidem.");

    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/painel/explorar")}`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setErrorMsg("Este email já está cadastrado. Faça login para continuar.");
      } else {
        setErrorMsg("Não foi possível criar sua conta agora. Tente novamente.");
      }
      setSubmitting(false);
      return;
    }

    if (data.session) {
      setStep("success");
      setHelperMsg("Conta criada com sucesso.");
      setSubmitting(false);
      router.refresh();
      return;
    }

    setStep("verify");
    setHelperMsg("Enviamos um código para o seu email. Digite os 6 números.");
    setSubmitting(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const token = code.join("");
    if (token.length !== 6) return setErrorMsg("Digite os 6 números do código.");

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });

    if (error) {
      setErrorMsg("Código inválido ou expirado. Solicite um novo envio.");
      setSubmitting(false);
      return;
    }

    setStep("success");
    setHelperMsg("Email verificado. Seu acesso está pronto.");
    setSubmitting(false);
    router.refresh();
  }

  async function handleResend() {
    setResending(true);
    setErrorMsg(null);
    setHelperMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/painel/explorar")}`,
      },
    });
    if (error) {
      setErrorMsg("Não foi possível reenviar agora. Tente novamente.");
    } else {
      setHelperMsg("Novo código enviado.");
    }
    setResending(false);
  }

  function handleCodeChange(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    if (digit && i < 5) codeRefs.current[i + 1]?.focus();
  }

  function handleCodeKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[i] && i > 0) codeRefs.current[i - 1]?.focus();
  }

  function handleCodePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    const next = ["", "", "", "", "", ""];
    digits.split("").forEach((d, i) => { next[i] = d; });
    setCode(next);
    codeRefs.current[Math.min(digits.length, 5)]?.focus();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand-green-700)_0%,var(--brand-green-800)_100%)] text-sm font-bold text-white">
              G
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {step === "form" ? title : step === "verify" ? "Confirme seu email" : "Cadastro concluído"}
              </h2>
              <p className="text-xs text-slate-500">
                {step === "form"
                  ? subtitle
                  : step === "verify"
                  ? "Digite o código de 6 dígitos que enviamos."
                  : "Tudo pronto."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 p-5">
          {errorMsg && <div className="alert-error text-xs">{errorMsg}</div>}
          {helperMsg && !errorMsg && (
            <div className="alert-success text-xs">{helperMsg}</div>
          )}

          {step === "form" && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Mail className="h-3.5 w-3.5" /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[color:var(--brand-green-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-100)]"
                  placeholder="você@empresa.com"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <KeyRound className="h-3.5 w-3.5" /> Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-[color:var(--brand-green-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-100)]"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Ocultar" : "Mostrar"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Confirmar senha</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-[color:var(--brand-green-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-100)]"
                    placeholder="Repita a senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600"
                    aria-label={showConfirm ? "Ocultar" : "Mostrar"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-[color:var(--brand-green-100)] bg-[color:var(--brand-green-50)] p-2.5 text-[11px] text-[color:var(--brand-green-900)]">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--brand-green-700)]" />
                <p>Enviaremos um código de confirmação para validar seu email.</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--brand-green-700)_0%,var(--brand-green-800)_100%)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? "Criando conta..." : "Enviar código"}
              </button>

              {onSwitchToLogin && (
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <LogIn className="h-3.5 w-3.5" /> Já tenho conta
                </button>
              )}
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600">
                Código enviado para <strong className="text-slate-800">{email}</strong>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {code.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { codeRefs.current[i] = el; }}
                    value={d}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKey(i, e)}
                    onPaste={handleCodePaste}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    aria-label={`Dígito ${i + 1} de 6`}
                    className="h-11 rounded-lg border border-slate-200 bg-white text-center text-base font-semibold text-slate-900 focus:border-[color:var(--brand-green-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-100)]"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--brand-green-700)_0%,var(--brand-green-800)_100%)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? "Validando..." : "Confirmar código"}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[color:var(--brand-green-200)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--brand-green-700)] hover:bg-[color:var(--brand-green-50)] disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
                  {resending ? "Reenviando..." : "Reenviar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setCode(["", "", "", "", "", ""]);
                    setErrorMsg(null);
                    setHelperMsg(null);
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                </button>
              </div>
            </form>
          )}

          {step === "success" && (
            <div className="py-4 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[color:var(--brand-green-600)]" />
              <p className="text-sm font-semibold text-slate-900">Tudo certo por aqui.</p>
              <p className="mt-1 text-xs text-slate-600">Seu acesso está pronto.</p>
              <button
                type="button"
                onClick={() => {
                  void onSuccess?.();
                }}
                className="mt-4 w-full rounded-lg bg-[color:var(--brand-green-600)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)]"
              >
                Continuar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
