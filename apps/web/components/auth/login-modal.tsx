"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Eye, EyeOff, Mail, LockKeyhole, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  onSwitchToRegister?: () => void;
  title?: string;
  subtitle?: string;
}

export default function LoginModal({
  open,
  onClose,
  onSuccess,
  onSwitchToRegister,
  title = "Entre na sua conta",
  subtitle = "Continue de onde parou.",
}: LoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setSubmitting(false);
      setErrorMsg(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg("Informe email e senha.");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrorMsg("Email ou senha incorretos.");
        } else if (error.message.includes("Email not confirmed")) {
          setErrorMsg("Confirme seu email antes de entrar.");
        } else {
          setErrorMsg("Não foi possível entrar. Tente novamente.");
        }
        setSubmitting(false);
        return;
      }
      router.refresh();
      await onSuccess?.();
    } catch {
      setErrorMsg("Erro inesperado. Tente novamente.");
      setSubmitting(false);
    }
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-sm font-bold text-white">
              G
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500">{subtitle}</p>
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

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label htmlFor="login-modal-email" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Mail className="h-3.5 w-3.5" /> Email
            </label>
            <input
              id="login-modal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[color:var(--brand-green-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-100)]"
              placeholder="empresa@dominio.com"
            />
          </div>

          <div>
            <label htmlFor="login-modal-password" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <LockKeyhole className="h-3.5 w-3.5" /> Senha
            </label>
            <div className="relative">
              <input
                id="login-modal-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-[color:var(--brand-green-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-100)]"
                placeholder="Digite sua senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-1 text-right">
              <Link
                href="/recuperar-senha"
                className="text-[11px] font-semibold text-[color:var(--brand-green-700)] hover:text-[color:var(--brand-green-600)]"
              >
                Esqueceu sua senha?
              </Link>
            </div>
          </div>

          {errorMsg && <div className="alert-error text-xs">{errorMsg}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--brand-green-600)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)] disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? "Entrando..." : "Entrar"}
          </button>

          {onSwitchToRegister && (
            <>
              <div className="flex items-center gap-3 pt-1">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  ou
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={onSwitchToRegister}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--brand-green-200)] bg-white px-4 py-2.5 text-sm font-semibold text-[color:var(--brand-green-700)] hover:bg-[color:var(--brand-green-50)]"
              >
                <UserPlus className="h-4 w-4" /> Criar cadastro grátis
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
