"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chooseInitialMode, requestRoleChange } from "@/app/actions/user";

type Mode = "buyer" | "supplier" | "both";

type PendingRoleRequest = {
  id: string;
  current_mode: Mode;
  target_mode: Mode;
  requested_at: string;
};

interface RoleModeCardProps {
  /** O que o usuário tem hoje (derivado do servidor): buyer | supplier | both */
  currentMode: Mode;
  hasSupplier: boolean;
  /** ISO timestamp da última troca; null = nunca trocou (sem cooldown) */
  lastRoleChangeAt: string | null;
  /** Pedido pendente de troca aguardando aprovação do admin. */
  pendingRoleRequest: PendingRoleRequest | null;
  /** Se false, é a primeira escolha do user (pulou o onboarding). Confirmação direta, sem cooldown. */
  initialSegmentChosen: boolean;
}

const COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000;

function formatRemaining(ms: number) {
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

const OPTIONS = [
  { value: "buyer",    label: "Só comprar",       desc: "Encontrar fornecedores e enviar cotações" },
  { value: "supplier", label: "Só vender",        desc: "Receber cotações e gerenciar produtos" },
  { value: "both",     label: "Comprar e vender", desc: "Acesso completo a todas as funcionalidades" },
] as const;

const MODE_LABEL: Record<Mode, string> = {
  buyer: "Só comprar",
  supplier: "Só vender",
  both: "Comprar e vender",
};

function formatRequestedAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RoleModeCard({
  currentMode,
  lastRoleChangeAt,
  pendingRoleRequest,
  initialSegmentChosen,
}: RoleModeCardProps) {
  const router = useRouter();
  const isFirstChoice = !initialSegmentChosen;
  const hasPending = !!pendingRoleRequest;
  // Pra primeira escolha, default selecionado é "buyer" (escolha mais comum).
  const defaultSelected: Mode = isFirstChoice ? "buyer" : currentMode;
  const [selected, setSelected] = useState<Mode>(defaultSelected);
  const [pending, startTransition] = useTransition();
  // Snapshot mount time so render stays pure (Date.now() during render breaks react-hooks/purity).
  const [mountedAt] = useState<number>(() => Date.now());

  // Cooldown só se aplica a trocas pós-primeira-escolha.
  const cooldownRemainingMs = !isFirstChoice && lastRoleChangeAt
    ? Math.max(0, COOLDOWN_MS - (mountedAt - new Date(lastRoleChangeAt).getTime()))
    : 0;
  const inCooldown = cooldownRemainingMs > 0;

  // Pra primeira escolha, qualquer opção é válida (mesmo "buyer" — confirma a escolha).
  const noChange = isFirstChoice ? false : selected === currentMode;

  function handleSubmit() {
    if (noChange) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.append("target_mode", selected);

      if (isFirstChoice) {
        const result = await chooseInitialMode({}, fd);
        if (result.success) {
          toast.success("Modo de uso ativado!");
          router.refresh();
        } else if (result.error) {
          toast.error(result.error);
        }
        return;
      }

      const result = await requestRoleChange({}, fd);
      if (result.success) {
        toast.success(result.pendingMessage ?? "Solicitação enviada para liberação do administrador.");
        setSelected(currentMode);
        router.refresh();
      } else if (result.error) {
        toast.error(result.error);
        setSelected(currentMode);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {isFirstChoice ? "Como você vai usar a plataforma?" : "Modo de uso"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isFirstChoice
            ? "Escolha agora — você pode trocar depois (com aprovação do administrador)."
            : "Defina como você utiliza a plataforma. A troca de modo passa por liberação do administrador."}
        </p>

        {!isFirstChoice && hasPending && pendingRoleRequest && (
          <div className="alert-warning flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-semibold">
                Em análise pelo administrador: troca para “{MODE_LABEL[pendingRoleRequest.target_mode]}”
              </p>
              <p className="text-xs">
                Solicitado em {formatRequestedAt(pendingRoleRequest.requested_at)}. Você não pode abrir um novo pedido até este ser processado.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {OPTIONS.map(({ value, label, desc }) => {
            const isActive = selected === value;
            const disabled = pending || (!isFirstChoice && hasPending);
            return (
              <label
                key={value}
                className={[
                  "flex flex-col gap-1 rounded-xl border-2 px-4 py-3 transition-colors",
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  isActive
                    ? "border-brand-600 bg-brand-50"
                    : "border-border hover:border-slate-300 bg-white",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="_role_mode"
                  value={value}
                  checked={isActive}
                  onChange={() => setSelected(value)}
                  disabled={disabled}
                  className="sr-only"
                />
                <span className={[
                  "text-sm font-semibold",
                  isActive ? "text-brand-700" : "text-slate-800",
                ].join(" ")}>
                  {label}
                </span>
                <span className="text-xs text-slate-500 leading-relaxed">{desc}</span>
              </label>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {isFirstChoice
              ? "Você ainda não escolheu como vai usar a plataforma."
              : hasPending
                ? "Aguardando liberação do administrador."
                : !noChange
                  ? "Ao confirmar, sua solicitação vai para liberação do administrador."
                  : `Modo atual: ${MODE_LABEL[currentMode]}`}
          </p>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending || noChange || inCooldown || (!isFirstChoice && hasPending)}
            className="btn-primary h-9 px-5 rounded-xl text-sm font-semibold"
          >
            {pending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {isFirstChoice ? "Confirmando..." : "Enviando..."}
              </>
            ) : (
              isFirstChoice ? "Confirmar escolha" : "Atualizar modo"
            )}
          </Button>
        </div>

        {!isFirstChoice && inCooldown && !noChange && !hasPending && (
          <div className="alert-warning text-xs">
            Você só pode pedir troca de modo a cada 2 dias. Faltam {formatRemaining(cooldownRemainingMs)} pra liberar.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
