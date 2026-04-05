"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecuperarSenhaForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Aponta diretamente para /redefinir-senha para cobrir:
        //   · PKCE   → chega com ?code=XXX, trocado client-side
        //   · Implicit/hash → browser detecta #access_token=...&type=recovery
        // Certifique-se de adicionar essa URL no Supabase Dashboard → Auth → Redirect URLs.
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      setStatus("sent");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao enviar email.");
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <Card className="w-full max-w-md shadow-xl border border-emerald-100">
        <CardContent className="pt-8 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-bold">Email enviado!</h2>
          <p className="text-muted-foreground leading-relaxed">
            Verifique sua caixa de entrada, procure pelo email de recuperação e use o link para criar uma nova senha.
          </p>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left text-sm text-emerald-800">
            Se não encontrar o email em alguns minutos, confira a pasta de spam ou tente reenviar.
          </div>
          <Button render={<Link href="/login" />} variant="outline" className="w-full">
            Voltar ao login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl border border-emerald-100">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-bold">Recuperar senha</CardTitle>
        <CardDescription>
          Digite seu email e enviaremos um link seguro para redefinir sua senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12"
              required
            />
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            O link expira por segurança. Depois de abrir o email, você vai definir a nova senha dentro da plataforma.
          </div>

          {status === "error" && (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <p className="text-sm font-medium text-destructive">{errorMsg}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 bg-[linear-gradient(135deg,var(--brand-green-600)_0%,var(--brand-green-700)_100%)] text-white hover:opacity-90"
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </span>
            ) : (
              "Enviar link de recuperação"
            )}
          </Button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar ao login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
