"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { activateSupplierTrial, deactivateSupplierSubscription } from "@/app/actions";

type Status = "inactive" | "trialing" | "active" | "expired";

interface Props {
  supplierId: string;
  status: Status;
  expiresAt: string | null;
}

const STATUS_LABEL: Record<Status, string> = {
  inactive: "Inativo",
  trialing: "Trial",
  active: "Ativo",
  expired: "Expirado",
};

const STATUS_TONE: Record<Status, string> = {
  inactive: "bg-slate-100 text-slate-700 border-slate-200",
  trialing: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expired: "bg-red-50 text-red-700 border-red-200",
};

export default function SubscriptionButton({ supplierId, status, expiresAt }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isCurrentlyActive =
    (status === "trialing" || status === "active") &&
    (!expiresAt || new Date(expiresAt) > new Date());

  function activate() {
    if (!window.confirm("Ativar trial de 7 dias para este vendedor?")) return;
    setError(null);
    startTransition(async () => {
      const r = await activateSupplierTrial(supplierId);
      if (r.error) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  function deactivate() {
    if (!window.confirm("Desativar assinatura deste vendedor agora?")) return;
    setError(null);
    startTransition(async () => {
      const r = await deactivateSupplierSubscription(supplierId);
      if (r.error) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[status]}`}
      >
        {STATUS_LABEL[status]}
        {isCurrentlyActive && expiresAt && (
          <span className="ml-1.5 opacity-70">· {formatDate(expiresAt)}</span>
        )}
      </span>
      <div className="flex gap-1.5">
        {!isCurrentlyActive ? (
          <button
            type="button"
            onClick={activate}
            disabled={pending}
            className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            title="Ativar 7 dias de trial"
          >
            {pending ? "Salvando…" : "Ativar trial 7d"}
          </button>
        ) : (
          <button
            type="button"
            onClick={deactivate}
            disabled={pending}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            title="Desativar assinatura"
          >
            {pending ? "Salvando…" : "Desativar"}
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
