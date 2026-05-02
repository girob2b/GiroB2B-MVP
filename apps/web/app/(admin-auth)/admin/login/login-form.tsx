"use client";

import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { adminLogin } from "@/lib/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, undefined);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state?.message) {
      toast.error(state.message);
    }
  }, [state?.message]);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">Login administrativo</h1>
          <p className="text-sm text-slate-500">
            Entre com suas credenciais para acessar o painel interno.
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="admin@empresa.com"
              required
              className="h-11 rounded-xl border-slate-200 bg-white"
            />
            {state?.errors?.email && (
              <p className="text-xs text-destructive">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              <span className="flex items-center gap-2">
                <LockKeyhole className="w-4 h-4" />
                Senha
              </span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                required
                className="h-11 rounded-xl border-slate-200 bg-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {state?.errors?.password && (
              <p className="text-xs text-destructive">{state.errors.password[0]}</p>
            )}
          </div>

          <Button type="submit" disabled={pending} className="h-11 w-full">
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
