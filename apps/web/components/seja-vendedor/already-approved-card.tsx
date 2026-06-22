"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Loader2, MailCheck, MailQuestion } from "lucide-react";

/**
 * Card "Já fui aprovado" — gate de cadastro pós-waitlist (decisão Vitor 2026-05-24).
 *
 * Fluxo:
 *   1. User clica → modal pede email cadastrado na waitlist
 *   2. POST /api/waitlist/check valida + retorna { status, token? }
 *   3. UI renderiza por status:
 *      - approved → CTA "Continuar pra criar conta" → /cadastro/vendedor?supplier_token=<uuid>
 *      - pending  → "Estamos avaliando, aguarde retorno"
 *      - not_found → "Esse email não está na lista" + CTA pra preencher form abaixo
 *
 * Sem dependência do Resend (que está fake) — validação síncrona, mais simples.
 */

type CheckResult =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "approved"; token: string; email: string }
  | { status: "pending"; email: string }
  | { status: "not_found" }
  | { status: "error"; message: string };

export function AlreadyApprovedCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section
        className="rounded-2xl border-2 border-[color:var(--brand-accent-300)] bg-gradient-to-r from-[color:var(--brand-accent-50)] to-white p-5 sm:p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--brand-accent-700)]">
              Já fui aprovado ✨
            </p>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Recebi confirmação por email do time GiroB2B
            </h2>
            <p className="text-sm text-slate-600">
              Use o email que cadastrou na lista pra liberar a criação da sua conta.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-[color:var(--brand-accent-500)] px-5 py-2.5 text-sm font-semibold text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-accent-600)] shadow-sm whitespace-nowrap"
          >
            Verificar meu email <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {open && <CheckModal onClose={() => setOpen(false)} />}
    </>
  );
}

function CheckModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<CheckResult>({ status: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setResult({ status: "error", message: "Email inválido." });
      return;
    }
    setResult({ status: "checking" });

    try {
      const res = await fetch("/api/waitlist/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await res.json()) as CheckResult;
      setResult(data);
    } catch {
      setResult({ status: "error", message: "Erro de conexão. Tente novamente." });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="approved-check-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/55 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 sm:p-7 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="space-y-1">
          <h2 id="approved-check-title" className="text-lg font-bold text-slate-900">
            Verificar aprovação
          </h2>
          <p className="text-sm text-slate-500">
            Digite o email que você cadastrou na lista de espera.
          </p>
        </header>

        {/* Estado: aprovado */}
        {result.status === "approved" && (
          <div className="rounded-xl border border-[color:var(--brand-primary-200)] bg-[color:var(--brand-primary-50)] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[color:var(--brand-primary-700)]" />
              <div>
                <p className="text-sm font-bold text-slate-900">Tudo certo! Você está aprovado.</p>
                <p className="text-xs text-slate-600 mt-1">
                  Vamos criar sua conta com o email <strong>{result.email}</strong>.
                </p>
              </div>
            </div>
            <a
              href={`/cadastro/vendedor?supplier_token=${result.token}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-primary-600)] px-5 py-3 text-sm font-semibold text-white hover:bg-[color:var(--brand-primary-700)]"
            >
              Continuar pra criar conta <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        {/* Estado: pendente */}
        {result.status === "pending" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-bold text-amber-900">Você está na lista — aguarde aprovação</p>
                <p className="text-xs text-amber-800 mt-1">
                  Seu email <strong>{result.email}</strong> está em análise pelo time GiroB2B. Te avisamos
                  por email assim que liberarmos.
                </p>
                <p className="text-xs text-amber-800 mt-2">
                  Dúvidas? <a href="mailto:comercial@girob2b.com.br" className="underline font-semibold">comercial@girob2b.com.br</a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Estado: não encontrado */}
        {result.status === "not_found" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <MailQuestion className="h-5 w-5 shrink-0 text-slate-500" />
              <div>
                <p className="text-sm font-bold text-slate-900">Esse email não está na nossa lista</p>
                <p className="text-xs text-slate-600 mt-1">
                  Pra criar conta como vendedor, primeiro você precisa entrar na lista de espera. Use o
                  formulário abaixo pra se cadastrar.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ir pra lista de espera ↓
            </button>
          </div>
        )}

        {/* Estado: erro */}
        {result.status === "error" && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {result.message}
          </div>
        )}

        {/* Form (visível em idle, checking e error) */}
        {(result.status === "idle" || result.status === "checking" || result.status === "error") && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="approval-email" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Email cadastrado *
              </label>
              <div className="relative">
                <MailCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="approval-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  disabled={result.status === "checking"}
                  placeholder="seu@empresa.com.br"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)] disabled:opacity-60"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={result.status === "checking"}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-primary-600)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--brand-primary-700)] disabled:opacity-60"
              >
                {result.status === "checking" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verificando…</>
                ) : (
                  <>Verificar <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Botão fechar pra estados terminais */}
        {(result.status === "approved" || result.status === "pending") && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
