import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Confirme seu email" };

export default function ConfirmarEmailCompradorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-5">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
          <MailCheck className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold">Verifique seu email</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Enviamos um link de confirmação. Após confirmar, você poderá enviar cotações para fornecedores.
        </p>
        <Button render={<Link href="/login" />} variant="outline" className="w-full">
          Já confirmei — Fazer login
        </Button>
      </div>
    </div>
  );
}
