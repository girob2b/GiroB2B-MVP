"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MoreHorizontal, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteDemandAction, updateDemandStatusAction } from "@/app/actions/demands";

interface Props {
  demandId: string;
  status: string;
}

export default function DemandActions({ demandId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setStatus(target: "fulfilled" | "cancelled") {
    startTransition(async () => {
      const result = await updateDemandStatusAction(demandId, target);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(target === "fulfilled" ? "Marcada como resolvida." : "Necessidade cancelada.");
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Excluir essa necessidade? Essa ação não pode ser desfeita.")) return;
    startTransition(async () => {
      const result = await deleteDemandAction(demandId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Necessidade excluída.");
      router.refresh();
    });
  }

  const canResolve = status === "open" || status === "negotiating";
  const canCancel = status === "open" || status === "negotiating";

  return (
    <div className="inline-flex items-center gap-1.5">
      {canResolve && (
        <button
          type="button"
          onClick={() => setStatus("fulfilled")}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          title="Marcar como resolvida"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Resolvida
        </button>
      )}
      {canCancel && (
        <button
          type="button"
          onClick={() => setStatus("cancelled")}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          title="Cancelar"
        >
          <X className="h-3.5 w-3.5 text-amber-600" /> Cancelar
        </button>
      )}
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        title="Excluir"
      >
        <Trash2 className="h-3.5 w-3.5" /> Excluir
      </button>
    </div>
  );
}
