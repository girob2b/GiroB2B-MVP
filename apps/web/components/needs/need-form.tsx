"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export interface NeedFormValues {
  productName: string;
  description: string;
}

interface NeedFormProps {
  initialProductName?: string;
  initialDescription?: string | null;
  submitLabel?: string;
  submittingLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  onCancel?: () => void;
  onUnauthenticated?: (values: NeedFormValues) => void;
  onSuccess?: () => void;
}

export function validateNeedForm(values: NeedFormValues) {
  if (values.productName.trim().length < 2) {
    return "Informe o nome do produto (minimo 2 caracteres).";
  }

  return null;
}

export async function submitNeedRequest(values: NeedFormValues) {
  const response = await fetch("/api/search/needs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productName: values.productName.trim(),
      description: values.description.trim() || null,
    }),
  });

  const payload = await response.json().catch(() => ({})) as { error?: string };
  return { response, payload };
}

export default function NeedForm({
  initialProductName = "",
  initialDescription = "",
  submitLabel = "Enviar necessidade",
  submittingLabel = "Enviando...",
  cancelLabel = "Cancelar",
  showCancel = false,
  onCancel,
  onUnauthenticated,
  onSuccess,
}: NeedFormProps) {
  const [productName, setProductName] = useState(initialProductName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProductName(initialProductName);
    setDescription(initialDescription ?? "");
    setError(null);
    setSubmitting(false);
  }, [initialProductName, initialDescription]);

  async function handleSubmit() {
    const values: NeedFormValues = {
      productName: productName.trim(),
      description: description.trim(),
    };

    const validationError = validateNeedForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const { response, payload } = await submitNeedRequest(values);

      if (response.status === 401) {
        onUnauthenticated?.(values);
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error ?? `Erro ${response.status}`);
      }

      onSuccess?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Nao foi possivel enviar sua necessidade. Tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          Nome do produto
        </label>
        <input
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[color:var(--brand-green-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-100)]"
          placeholder="Ex.: Filme stretch, parafuso M8, tecido oxford"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          Descricao <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[color:var(--brand-green-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-100)]"
          placeholder="Descreva detalhes, aplicacao, certificacoes ou observacoes relevantes."
        />
      </div>

      {error && <div className="alert-error text-xs">{error}</div>}

      <div className="flex justify-end gap-2 pt-1">
        {showCancel && (
          <button
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
        )}
        <button
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg bg-[color:var(--brand-green-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)] disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </div>
  );
}
