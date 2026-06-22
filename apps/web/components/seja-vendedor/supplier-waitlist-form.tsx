"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  /** Origem usada pra analytics e debug — preencher conforme o local do CTA. */
  source: "seja_vendedor_hero" | "seja_vendedor_cta";
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function formatCNPJ(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isCnpjValidLength(cnpj: string): boolean {
  return onlyDigits(cnpj).length === 14;
}

export default function SupplierWaitlistForm({ source }: Props) {
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [category, setCategory] = useState("");
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!isEmailValid(email)) next.email = "Email inválido";
    if (!isCnpjValidLength(cnpj)) next.cnpj = "CNPJ inválido (14 dígitos)";
    if (!category.trim()) next.category = "Informe o que você vende";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setErrors({});
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.from("waitlist").insert({
      role: "supplier",
      email: email.toLowerCase().trim(),
      cnpj: onlyDigits(cnpj),
      category: category.trim(),
      consent_marketing: consent,
      source,
      user_agent: navigator.userAgent.slice(0, 500),
    });

    if (error) {
      if (error.code === "23505") {
        setResult({ ok: false, error: "Esse CNPJ + email já está na lista. Vamos te avisar." });
      } else {
        setResult({ ok: false, error: "Erro ao enviar. Tente novamente em alguns segundos." });
      }
      setSubmitting(false);
      return;
    }

    setResult({ ok: true });
    setSubmitting(false);
  }

  if (result?.ok) {
    return (
      <div className="rounded-2xl border border-[color:var(--brand-primary-200)] bg-[color:var(--brand-primary-50)] p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-[color:var(--brand-primary-700)]" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">Você está na lista</h3>
            <p className="mt-1 text-sm text-slate-700">
              Estamos abrindo a plataforma pra vendedores aos poucos. Vamos avaliar seu cadastro e
              enviar o link de acesso para <strong>{email}</strong> em breve.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="sw-email" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
          Email corporativo *
        </label>
        <input
          id="sw-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="seu@empresa.com.br"
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
        />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="sw-cnpj" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
          CNPJ *
        </label>
        <input
          id="sw-cnpj"
          type="text"
          value={cnpj}
          onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
          placeholder="00.000.000/0000-00"
          inputMode="numeric"
          autoComplete="off"
          required
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
        />
        {errors.cnpj && <p className="mt-1 text-xs text-destructive">{errors.cnpj}</p>}
      </div>

      <div>
        <label htmlFor="sw-category" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
          O que você vende *
        </label>
        <input
          id="sw-category"
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          maxLength={120}
          placeholder="Ex.: Embalagens plásticas, Equipamentos industriais..."
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
        />
        {errors.category && <p className="mt-1 text-xs text-destructive">{errors.category}</p>}
      </div>

      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[color:var(--brand-primary-600)] focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
        />
        <span className="leading-relaxed">
          Quero receber emails sobre o lançamento e novidades da GiroB2B. Posso cancelar a qualquer momento.
        </span>
      </label>

      {result?.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {result.error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-primary-600)] px-6 text-sm font-semibold text-white hover:bg-[color:var(--brand-primary-700)] disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Entrar na lista de espera <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-slate-500">
        Estamos abrindo o acesso pra vendedores em ondas. Vamos avaliar seu cadastro e te avisar por email.
      </p>
    </form>
  );
}
