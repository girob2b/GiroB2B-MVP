"use client";

import { useRef, useState } from "react";
import { FileKey, Eye, EyeOff, Loader2, X, Upload, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface CertA1SectionProps {
  onSuccess?: () => void;
  onCancel: () => void;
  redirectTo?: string;
}

export function CertA1Section({
  onSuccess,
  onCancel,
  redirectTo = "/painel/explorar",
}: CertA1SectionProps) {
  const router              = useRouter();
  const fileRef             = useRef<HTMLInputElement>(null);
  const [file, setFile]     = useState<File | null>(null);
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Selecione o arquivo .pfx do seu certificado."); return; }
    if (!password) { setError("Digite a senha do certificado."); return; }

    setLoading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("pfx", file);
      body.append("password", password);

      const res  = await fetch("/api/auth/cert-a1", { method: "POST", body });
      const json = await res.json() as { token_hash?: string; company_name?: string; cnpj?: string; error?: string };

      if (!res.ok || !json.token_hash) {
        setError(json.error ?? "Erro ao processar certificado.");
        setLoading(false);
        return;
      }

      // Exchange server-issued token for a real session
      const supabase = createClient();
      const { error: otpErr } = await supabase.auth.verifyOtp({
        token_hash: json.token_hash,
        type:       "magiclink",
      });

      if (otpErr) {
        setError("Não foi possível criar sessão. Tente novamente.");
        setLoading(false);
        return;
      }

      await onSuccess?.();
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Erro inesperado. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Certificado Digital A1</p>
            <p className="text-[11px] text-slate-500">e-CNPJ emitido pela ICP-Brasil</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Voltar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* File picker */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pfx,.p12"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-left hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
          >
            <Upload className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0">
              {file ? (
                <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700">Selecionar arquivo .pfx</p>
                  <p className="text-[11px] text-slate-400">Seu arquivo não é armazenado</p>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Password */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha do certificado"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Verificando certificado...</>
          ) : (
            <><FileKey className="h-4 w-4" /> Entrar com certificado</>
          )}
        </button>
      </form>

      <p className="text-center text-[11px] text-slate-400">
        O arquivo .pfx é processado em memória e nunca armazenado.
      </p>
    </div>
  );
}
