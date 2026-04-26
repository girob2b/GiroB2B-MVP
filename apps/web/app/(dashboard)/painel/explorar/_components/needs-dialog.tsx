"use client";

import { useEffect, useState } from "react";
import { X, Loader2, CheckCircle2, ClipboardList } from "lucide-react";
import LoginModal from "@/components/auth/login-modal";
import RegisterModal from "@/components/auth/register-modal";

const PENDING_NEED_KEY = "girob2b_pending_need";

interface NeedsDialogProps {
  open: boolean;
  initialQuery: string;
  initialDescription?: string | null;
  filters?: {
    state?: string;
    category?: string;
  };
  onClose: () => void;
}

export default function NeedsDialog({
  open,
  initialQuery,
  initialDescription,
  filters,
  onClose,
}: NeedsDialogProps) {
  const [query, setQuery] = useState(initialQuery);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setDescription(initialDescription ?? "");
      setError(null);
      setSuccess(false);
      setSubmitting(false);
      setShowLogin(false);
      setShowRegister(false);
    }
  }, [open, initialQuery, initialDescription]);

  if (!open) return null;

  function persistPendingNeed() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        PENDING_NEED_KEY,
        JSON.stringify({
          query: query.trim(),
          description: description.trim() || null,
          filters: filters ?? {},
          timestamp: Date.now(),
        })
      );
    } catch {
      /* ignore */
    }
  }

  async function submitNeed(): Promise<boolean> {
    setError(null);
    if (query.trim().length < 2) {
      setError("Informe o que você procura (mínimo 2 caracteres).");
      return false;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/search/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          description: description.trim() || null,
          filters: filters ?? {},
        }),
      });
      if (res.status === 401) {
        persistPendingNeed();
        setShowLogin(true);
        return false;
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? `Erro ${res.status}`);
      }
      setSuccess(true);
      return true;
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "unauthenticated"
          ? err.message
          : "Não foi possível enviar sua necessidade. Tente novamente."
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAuthSuccess() {
    setShowLogin(false);
    setShowRegister(false);
    await submitNeed();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex justify-end bg-slate-900/50"
        onClick={onClose}
      >
        <aside
          className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl ring-1 ring-slate-200 animate-in slide-in-from-right duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-[color:var(--brand-green-50)] p-2 text-[color:var(--brand-green-700)]">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Adicionar à lista de necessidades
                </h2>
                <p className="text-xs text-slate-500">
                  Nossos administradores buscam e cadastram o fornecedor em 1 a 2 dias úteis.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {success ? (
            <div className="p-6 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[color:var(--brand-green-600)]" />
              <h3 className="text-base font-semibold text-slate-900">Necessidade registrada</h3>
              <p className="mt-1 text-sm text-slate-600">
                Avisaremos por email quando o fornecedor for cadastrado (geralmente 1 a 2 dias úteis).
              </p>
              <button
                onClick={onClose}
                className="mt-5 rounded-lg bg-[color:var(--brand-green-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)]"
              >
                Fechar
              </button>
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  O que você procura?
                </label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[color:var(--brand-green-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-100)]"
                  placeholder="ex.: fornecedor de embalagens biodegradáveis"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Detalhes adicionais <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[color:var(--brand-green-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-100)]"
                  placeholder="Volume estimado, região preferida, certificações, prazo, etc."
                />
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <strong>Importante:</strong> o cadastro manual pode levar de <strong>1 a 2 dias úteis</strong>.
                Enquanto isso, a necessidade ficará visível para a equipe interna.
              </div>

              {error && <div className="alert-error text-xs">{error}</div>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void submitNeed()}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-[color:var(--brand-green-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)] disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Enviar necessidade
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Modais centrados por cima do drawer, quando o gate dispara */}
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={handleAuthSuccess}
        onSwitchToRegister={() => {
          setShowLogin(false);
          setShowRegister(true);
        }}
        title="Entre para enviar sua necessidade"
        subtitle="Sua busca já está salva — é só confirmar quem você é."
      />

      <RegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onSuccess={handleAuthSuccess}
        onSwitchToLogin={() => {
          setShowRegister(false);
          setShowLogin(true);
        }}
        title="Criar cadastro grátis"
        subtitle="Sua busca já está salva — leva menos de 1 minuto."
      />
    </>
  );
}
