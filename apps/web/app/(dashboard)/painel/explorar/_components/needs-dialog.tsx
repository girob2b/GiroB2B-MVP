"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle2, ClipboardList } from "lucide-react";
import LoginModal from "@/components/auth/login-modal";
import RegisterModal from "@/components/auth/register-modal";
import NeedForm, { submitNeedRequest, type NeedFormValues } from "@/components/needs/need-form";

const PENDING_NEED_KEY = "girob2b_pending_need";

interface NeedsDialogProps {
  open: boolean;
  initialProductName: string;
  initialDescription?: string | null;
  onClose: () => void;
}

export default function NeedsDialog({
  open,
  initialProductName,
  initialDescription,
  onClose,
}: NeedsDialogProps) {
  const [success, setSuccess] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [pendingValues, setPendingValues] = useState<NeedFormValues>({
    productName: initialProductName,
    description: initialDescription ?? "",
  });

  useEffect(() => {
    if (open) {
      setSuccess(false);
      setShowLogin(false);
      setShowRegister(false);
      setPendingValues({
        productName: initialProductName,
        description: initialDescription ?? "",
      });
    }
  }, [open, initialProductName, initialDescription]);

  if (!open) return null;

  function persistPendingNeed(values: NeedFormValues) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        PENDING_NEED_KEY,
        JSON.stringify({
          query: values.productName.trim(),
          description: values.description.trim() || null,
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore
    }
  }

  async function submitPendingNeedAfterAuth(values: NeedFormValues) {
    const { response } = await submitNeedRequest(values);
    if (response.ok) {
      setSuccess(true);
      return;
    }
  }

  function handleAuthSuccess() {
    setShowLogin(false);
    setShowRegister(false);
    void submitPendingNeedAfterAuth(pendingValues);
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
                  Adicionar a lista de necessidades
                </h2>
                <p className="text-xs text-slate-500">
                  Nossos administradores buscam e cadastram o fornecedor em 1 a 2 dias uteis.
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
                Avisaremos por email quando o fornecedor for cadastrado (geralmente 1 a 2 dias uteis).
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
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <strong>Importante:</strong> o cadastro manual pode levar de <strong>1 a 2 dias uteis</strong>.
                Enquanto isso, a necessidade ficara visivel para a equipe interna.
              </div>

              <NeedForm
                initialProductName={pendingValues.productName}
                initialDescription={pendingValues.description}
                showCancel
                onCancel={onClose}
                onUnauthenticated={(values) => {
                  setPendingValues(values);
                  persistPendingNeed(values);
                  setShowLogin(true);
                }}
                onSuccess={() => setSuccess(true)}
              />
            </div>
          )}
        </aside>
      </div>

      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={handleAuthSuccess}
        onSwitchToRegister={() => {
          setShowLogin(false);
          setShowRegister(true);
        }}
        title="Entre para enviar sua necessidade"
        subtitle="Sua busca ja esta salva - e so confirmar quem voce e."
      />

      <RegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onSuccess={handleAuthSuccess}
        onSwitchToLogin={() => {
          setShowRegister(false);
          setShowLogin(true);
        }}
        title="Criar cadastro gratis"
        subtitle="Sua busca ja esta salva - leva menos de 1 minuto."
      />
    </>
  );
}
