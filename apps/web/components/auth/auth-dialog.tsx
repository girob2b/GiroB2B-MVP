"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import LoginForm from "@/app/(auth)/login/login-form";
import BuyerRegisterForm from "@/app/(auth)/cadastro/buyer-register-form";

export type AuthMode = "login" | "register";

interface AuthDialogProps {
  mode: AuthMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal de auth — encapsula os mesmos forms das rotas /login e /cadastro.
 *
 * Princípio "facilitar comprador" (memory: project_buyer_friction_principle):
 * o user pode autenticar sem perder contexto da página em que estava.
 *
 * As rotas dedicadas /login e /cadastro continuam funcionando como fallback
 * (links de email, callbacks externos, bookmarks). Este modal é um atalho UX
 * disponível em qualquer página pública via `?auth=login|register`.
 */
export function AuthDialog({ mode, open, onOpenChange }: AuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden"
        // Backdrop reforçado: blur-md + 30% de preto. Coloca o foco visual no
        // modal e tira a distração do conteúdo de fundo (override do default
        // blur-xs / bg-black/10 do DialogOverlay).
        overlayClassName="bg-black/30 supports-backdrop-filter:backdrop-blur-md"
      >
        <DialogTitle className="sr-only">
          {mode === "login" ? "Entrar na sua conta" : "Criar uma conta"}
        </DialogTitle>
        <div className="px-6 py-7">
          {mode === "login" ? <LoginForm inModal /> : <BuyerRegisterForm inModal />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
