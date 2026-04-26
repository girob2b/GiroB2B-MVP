"use client";

import { useState, useTransition } from "react";
import { toggleSuspendSupplier } from "../../actions";
import { Button } from "@/components/ui/button";

export default function SuspendButton({
  supplierId,
  suspended,
}: {
  supplierId: string;
  suspended: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await toggleSuspendSupplier(supplierId, !suspended);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={suspended ? "outline" : "destructive"}
        onClick={handleClick}
        disabled={isPending}
        className="min-w-[110px]"
      >
        {isPending ? "Salvando…" : suspended ? "Reativar" : "Suspender"}
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
