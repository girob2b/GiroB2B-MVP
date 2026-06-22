"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setBuyerPublicProfileOptInAction } from "@/app/actions/buyers";
import {
  BUYER_PUBLIC_PROFILE_CONSENT_TEXT,
  BUYER_PUBLIC_PROFILE_CONSENT_TEXT_VERSION,
} from "@/lib/schemas/buyers";

interface PublicProfileToggleProps {
  /** Estado inicial do opt-in (buyers.public_profile_opt_in). */
  initialOptIn: boolean;
  /** Slug público atual, se já gerado. Liga o link "ver perfil público". */
  initialSlug: string | null;
  /**
   * Elegibilidade: precisa de CNPJ + razão social pra poder ligar o opt-in.
   * Quando false, o toggle fica desabilitado com explicação.
   */
  canEnable: boolean;
}

/**
 * Toggle de opt-in "Aparecer como empresa pública na vitrine".
 *
 * - Mostra o TEXTO DE CONSENT LGPD exato (lib/schemas/buyers) ao lado do controle.
 * - Chama setBuyerPublicProfileOptInAction(boolean) — não FormData.
 * - Se faltar CNPJ/razão social: desabilita com explicação + link pra completar.
 * - Estados loading/sucesso/erro.
 *
 * Switch acessível construído à mão (não há componente Switch no DS):
 * <button role="switch" aria-checked>. Cumpre AA (foco visível, contraste).
 */
export default function PublicProfileToggle({
  initialOptIn,
  initialSlug,
  canEnable,
}: PublicProfileToggleProps) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [slug, setSlug] = useState(initialSlug);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    if (pending) return;
    const next = !optIn;

    // Bloqueia ligar sem identidade real — defesa em profundidade
    // (a RPC também valida no servidor).
    if (next && !canEnable) {
      toast.error(
        "Preencha o CNPJ e a razão social da sua empresa pra poder aparecer."
      );
      return;
    }

    startTransition(async () => {
      const result = await setBuyerPublicProfileOptInAction(next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOptIn(result.optIn);
      setSlug(result.slug);
      toast.success(
        result.optIn
          ? "Pronto! Sua empresa agora aparece na vitrine pública."
          : "Sua empresa foi removida da vitrine pública."
      );
    });
  }

  const disabled = pending || (!optIn && !canEnable);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Perfil público na vitrine</CardTitle>
          {optIn && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--brand-primary-200)] bg-[color:var(--brand-primary-50)] px-2.5 py-1 text-xs font-semibold text-[color:var(--brand-primary-700)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Ativo
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-slate-800">
              Aparecer como empresa pública na vitrine
            </p>
            <p className="text-sm text-muted-foreground">
              Sua empresa entra na vitrine da home e ganha um perfil público em{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                /empresa/sua-empresa
              </code>{" "}
              com suas demandas abertas. Só razão social, setor, cidade/UF e
              demandas — <strong>nunca</strong> seus dados de contato.
            </p>
          </div>

          {/* Switch acessível */}
          <button
            type="button"
            role="switch"
            aria-checked={optIn}
            aria-label="Aparecer como empresa pública na vitrine"
            disabled={disabled}
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              optIn
                ? "border-brand-600 bg-brand-600"
                : "border-slate-300 bg-slate-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                optIn ? "translate-x-5" : "translate-x-0.5"
              }`}
            >
              {pending && (
                <Loader2 className="h-5 w-5 animate-spin p-0.5 text-brand-600" />
              )}
            </span>
          </button>
        </div>

        {/* Aviso de elegibilidade — falta CNPJ/razão social */}
        {!canEnable && !optIn && (
          <div className="alert-warning flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Preencha o <strong>CNPJ</strong> e a <strong>razão social</strong>{" "}
              no card &ldquo;Dados da empresa&rdquo; acima pra poder aparecer na
              vitrine.
            </span>
          </div>
        )}

        {/* Texto de consent LGPD — exibido sempre, é o aceite carimbado */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs leading-relaxed text-slate-600">
            {BUYER_PUBLIC_PROFILE_CONSENT_TEXT}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Versão do consentimento: {BUYER_PUBLIC_PROFILE_CONSENT_TEXT_VERSION}
          </p>
        </div>

        {/* Link pro perfil público quando ativo e com slug */}
        {optIn && slug && (
          <p className="flex items-center gap-2 text-sm text-brand-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <Link
              href={`/empresa/${slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 font-medium hover:underline"
            >
              Ver meu perfil público
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
