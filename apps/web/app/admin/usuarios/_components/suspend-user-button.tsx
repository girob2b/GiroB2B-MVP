"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toggleSuspendUser } from "../../actions";

export default function SuspendUserButton({
  userId,
  canManage,
  suspended,
}: {
  userId: string;
  canManage: boolean;
  suspended: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticSuspended, setOptimisticSuspended] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const currentSuspended = optimisticSuspended ?? suspended;

  if (!canManage) {
    return (
      <Button size="sm" variant="outline" disabled>
        Indisponivel
      </Button>
    );
  }

  const nextSuspend = !currentSuspended;

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await toggleSuspendUser(userId, nextSuspend);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setOptimisticSuspended(nextSuspend);
      setOpen(false);
      toast.success(nextSuspend ? "Usuário suspenso com sucesso." : "Usuário reativado com sucesso.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={currentSuspended ? "outline" : "destructive"}
        disabled={isPending}
        onClick={() => setOpen(true)}
        className="min-w-[110px]"
      >
        {isPending ? "Salvando..." : currentSuspended ? "Reativar" : "Suspender"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{nextSuspend ? "Suspender usuário" : "Reativar usuário"}</DialogTitle>
            <DialogDescription>
              {nextSuspend
                ? "Esse usuário será impedido de usar o sistema."
                : "Esse usuário voltará a acessar normalmente as rotas protegidas do sistema."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="-mx-0 -mb-0 border-t-0 bg-transparent p-0 pt-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant={nextSuspend ? "destructive" : "default"} onClick={onConfirm} disabled={isPending}>
              {isPending ? "Salvando..." : nextSuspend ? "Confirmar suspensão" : "Confirmar reativação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
