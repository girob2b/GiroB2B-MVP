"use client";

import { useState, useTransition } from "react";
import { deleteProduct } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

interface Props {
  productId: string;
  productName: string;
}

export default function DeleteProductButton({ productId, productName }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteProduct(productId);
    });
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-destructive">Tem certeza?</span>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sim"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirm(false)}
          disabled={isPending}
        >
          Não
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-destructive"
      onClick={() => setConfirm(true)}
      title={`Remover ${productName}`}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  );
}
