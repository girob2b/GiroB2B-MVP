import type { Metadata } from "next";
import { Suspense } from "react";
import RedefinirSenhaForm from "./redefinir-senha-form";

export const metadata: Metadata = {
  title: "Redefinir senha",
  description: "Defina sua nova senha para acessar a GiroB2B novamente.",
};

export default function RedefinirSenhaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12 bg-[radial-gradient(circle_at_top,rgba(10,92,92,0.10),transparent_45%),linear-gradient(180deg,#ffffff_0%,var(--brand-surface)_100%)]">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando recuperação de senha...</div>}>
        <RedefinirSenhaForm />
      </Suspense>
    </div>
  );
}
