"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import SupplierWaitlistForm from "@/components/seja-vendedor/supplier-waitlist-form";

const WAITLIST_PARAM = "waitlist";

/**
 * Controlador do modal de waitlist de vendedor via query param (?waitlist=supplier).
 *
 * Decisão de produto 2026-05-15: o botão "Sou vendedor" no header de visitantes
 * abre esse modal em vez de mandar pra rota /seja-vendedor — mesma estratégia
 * usada pra auth modal (?auth=login|register). Mantém o user no contexto da página.
 *
 * A rota /seja-vendedor continua existindo como landing dedicada (SEO + acesso direto).
 */
function SupplierWaitlistModalController() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Suprime o modal na própria /seja-vendedor — lá o form já está no corpo da página.
  if (pathname.startsWith("/seja-vendedor")) return null;

  const open = params.get(WAITLIST_PARAM) === "supplier";

  function close() {
    const next = new URLSearchParams(params.toString());
    next.delete(WAITLIST_PARAM);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden"
        overlayClassName="bg-black/30 supports-backdrop-filter:backdrop-blur-md"
      >
        <DialogHeader className="bg-[color:var(--brand-primary-600)] px-5 py-3">
          <DialogTitle className="text-sm font-bold text-white">Quero vender</DialogTitle>
          <DialogDescription className="text-xs text-[color:var(--brand-primary-100)]">
            Entre na lista de espera
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-5">
          <SupplierWaitlistForm source="seja_vendedor_hero" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SupplierWaitlistModalRoot() {
  return (
    <Suspense fallback={null}>
      <SupplierWaitlistModalController />
    </Suspense>
  );
}
