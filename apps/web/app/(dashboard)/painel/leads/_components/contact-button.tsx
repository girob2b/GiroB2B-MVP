"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { contactDemandAction } from "@/app/actions/leads";

interface Props {
  demandId: string;
  canContact: boolean;
  hasSupplier: boolean;
}

export default function ContactButton({ demandId, canContact, hasSupplier }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!canContact) {
    return (
      <button
        type="button"
        onClick={() => router.push(hasSupplier ? "/seja-vendedor" : "/seja-vendedor")}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-300"
      >
        <Lock className="h-4 w-4" />
        {hasSupplier ? "Assine para contatar" : "Cadastre-se como vendedor"}
      </button>
    );
  }

  function handleClick() {
    startTransition(async () => {
      const result = await contactDemandAction(demandId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      // Abre o WhatsApp em nova aba
      window.open(result.whatsappLink, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-green-600)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)] disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      Contatar via WhatsApp
    </button>
  );
}
