"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, Mail, User } from "lucide-react";
import { toast } from "sonner";
import {
  createSupplierFromApprovedWaitlist,
  type SupplierSignupState,
} from "@/app/actions/supplier-signup";

interface Props {
  waitlistId: string;
  approvalToken: string;
  email: string;
  cnpj: string;
  category: string;
}

const INITIAL_STATE: SupplierSignupState = {};

export default function SupplierSignupForm({
  approvalToken,
  email,
  cnpj,
  category,
}: Props) {
  const [state, action, pending] = useActionState(
    createSupplierFromApprovedWaitlist,
    INITIAL_STATE,
  );
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state?.message) toast.error(state.message);
  }, [state]);

  // Sucesso → redireciona pro login (server action não pode mudar window).
  useEffect(() => {
    if (state?.ok) {
      window.location.href = "/login?status=cadastro_concluido";
    }
  }, [state?.ok]);

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <input type="hidden" name="approval_token" value={approvalToken} />
      <input type="hidden" name="email"          value={email} />

      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">Criar sua conta de vendedor</h1>
        <p className="text-sm text-slate-500">
          Já temos seu CNPJ e categoria da lista de espera. Só falta nome + senha.
        </p>
      </header>

      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1 text-xs">
        <p><strong className="text-slate-700">Email:</strong> <span className="text-slate-600">{email}</span></p>
        <p><strong className="text-slate-700">CNPJ:</strong> <span className="text-slate-600 font-mono">{cnpj}</span></p>
        <p><strong className="text-slate-700">Categoria:</strong> <span className="text-slate-600">{category}</span></p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="full_name" className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <User className="h-4 w-4 text-slate-400" />
          Seu nome <span className="text-destructive">*</span>
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          maxLength={120}
          placeholder="Ex.: João Silva"
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
        />
        {state?.errors?.full_name && (
          <p className="text-xs text-destructive">{state.errors.full_name[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <KeyRound className="h-4 w-4 text-slate-400" />
          Senha <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            placeholder="Mínimo de 8 caracteres"
            autoComplete="new-password"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {state?.errors?.password && (
          <p className="text-xs text-destructive">{state.errors.password[0]}</p>
        )}
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm cursor-pointer hover:bg-slate-100">
        <input
          type="checkbox"
          name="lgpd_consent"
          required
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-[color:var(--brand-primary-600)] focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
        />
        <span className="text-xs leading-relaxed text-slate-700">
          Li e aceito os{" "}
          <Link href="/termos" target="_blank" className="font-semibold text-[color:var(--brand-primary-700)] underline">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" target="_blank" className="font-semibold text-[color:var(--brand-primary-700)] underline">
            Política de Privacidade
          </Link>
          , autorizando o tratamento dos meus dados conforme a LGPD.
        </span>
      </label>
      {state?.errors?.lgpd_consent && (
        <p className="text-xs text-destructive">{state.errors.lgpd_consent[0]}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-primary-600)] px-6 py-3 text-sm font-semibold text-white hover:bg-[color:var(--brand-primary-700)] disabled:opacity-60"
      >
        {pending ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Criando conta…</>
        ) : (
          <>Criar conta de vendedor <ArrowRight className="h-4 w-4" /></>
        )}
      </button>

      <p className="text-center text-xs text-slate-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-[color:var(--brand-primary-700)] hover:underline">
          <Mail className="inline h-3 w-3" /> Fazer login
        </Link>
      </p>
    </form>
  );
}
