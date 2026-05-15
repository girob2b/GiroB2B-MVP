"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, X } from "lucide-react";
import { approveWaitlistEntry, unapproveWaitlistEntry } from "@/app/actions";

interface Props {
  waitlistId: string;
  email: string;
  approvedAt: string | null;
}

export default function WaitlistRowActions({ waitlistId, email, approvedAt }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function copyEmail() {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function approve() {
    startTransition(async () => {
      const r = await approveWaitlistEntry(waitlistId);
      if (r.error) {
        alert(`Erro: ${r.error}`);
        return;
      }
      router.refresh();
    });
  }

  function unapprove() {
    if (!window.confirm("Reverter aprovação deste inscrito?")) return;
    startTransition(async () => {
      const r = await unapproveWaitlistEntry(waitlistId);
      if (r.error) {
        alert(`Erro: ${r.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {approvedAt ? (
        <>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <Check className="h-3 w-3" /> Aprovado em {formatDate(approvedAt)}
          </span>
          <button
            type="button"
            onClick={unapprove}
            disabled={pending}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            title="Reverter aprovação"
          >
            <X className="h-3 w-3" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={approve}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
        >
          <Check className="h-3 w-3" />
          {pending ? "Aprovando…" : "Aprovar"}
        </button>
      )}
      <button
        type="button"
        onClick={copyEmail}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
        title="Copiar email"
      >
        <Copy className="h-3 w-3" />
        {copied ? "Copiado" : "Email"}
      </button>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}
