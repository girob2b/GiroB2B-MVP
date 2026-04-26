"use client";

import { useState, useTransition } from "react";
import {
  Package, DollarSign, CalendarDays, FileText,
  CheckCircle, XCircle, Clock, Truck, Star,
  ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  acceptProposal, refuseProposal,
  markShipped, confirmReceived,
} from "@/app/actions/proposals";
import type { ProposalData } from "@/app/actions/proposals";
import type { ChatMessage } from "@/app/actions/chat";
import { toast } from "sonner";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  sent:      { label: "Aguardando resposta", icon: <Clock      className="w-3 h-3" />, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  accepted:  { label: "Aceita",              icon: <CheckCircle className="w-3 h-3" />, cls: "bg-green-50 text-green-700 border-green-200"  },
  refused:   { label: "Recusada",            icon: <XCircle    className="w-3 h-3" />, cls: "bg-red-50 text-red-700 border-red-200"        },
  revised:   { label: "Revisada",            icon: <Clock      className="w-3 h-3" />, cls: "bg-blue-50 text-blue-700 border-blue-200"     },
  shipped:   { label: "Enviado",             icon: <Truck      className="w-3 h-3" />, cls: "bg-blue-50 text-blue-700 border-blue-200"     },
  completed: { label: "Concluído",           icon: <Star       className="w-3 h-3" />, cls: "bg-green-50 text-green-700 border-green-200"  },
  cancelled: { label: "Cancelada",           icon: <XCircle    className="w-3 h-3" />, cls: "bg-slate-50 text-slate-500 border-slate-200"  },
};

function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Refusal modal ────────────────────────────────────────────────────────────

function RefuseModal({
  proposalId,
  onClose,
  onDone,
}: { proposalId: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [pending, start]    = useTransition();

  function submit() {
    if (!reason.trim()) return;
    start(async () => {
      const r = await refuseProposal(proposalId, reason.trim());
      if (r && "error" in r) toast.error(r.error);
      else { toast.success("Proposta recusada."); onDone(); }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
        <p className="font-semibold text-slate-900">Motivo da recusa</p>
        <textarea
          autoFocus
          rows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Explique o motivo para o comprador poder revisar..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm text-slate-500 px-3 py-2 hover:text-slate-700">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!reason.trim() || pending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors"
          >
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Recusar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ProposalCard ─────────────────────────────────────────────────────────────

export interface ProposalCardProps {
  message: ChatMessage;
  role: string;
  proposal: ProposalData | null;
  isLatest: boolean;
  buyerId?: string | null;
  supplierId?: string | null;
  hasRevision?: boolean;
  onRevise?: (proposal: ProposalData) => void;
}

export default function ProposalCard({
  message, role, proposal, isLatest, buyerId, supplierId, hasRevision, onRevise,
}: ProposalCardProps) {
  const meta        = (message.metadata ?? {}) as Record<string, unknown>;
  const proposalId  = meta.proposal_id as string;
  const action      = meta.action as string;

  // Live data takes precedence over metadata snapshot
  const status          = proposal?.status            ?? (action === "sent" ? "sent" : action);
  const productName     = proposal?.product_name      ?? (meta.product_name as string)      ?? "Produto";
  const quantity        = proposal?.quantity          ?? (meta.quantity as number)           ?? 0;
  const unit            = proposal?.unit              ?? (meta.unit as string | null)        ?? null;
  const targetCents     = proposal?.target_price_cents ?? (meta.target_price_cents as number | null) ?? null;
  const budgetCents     = proposal?.max_budget_cents  ?? (meta.max_budget_cents as number | null)   ?? null;
  const deadline        = proposal?.delivery_deadline ?? (meta.delivery_deadline as string | null)  ?? null;
  const paymentTerms    = proposal?.payment_terms     ?? (meta.payment_terms as string | null)      ?? null;
  const notes           = proposal?.notes             ?? (meta.notes as string | null)              ?? null;
  const refusalReason   = proposal?.refusal_reason    ?? (meta.refusal_reason as string | null)     ?? null;

  const [expanded,       setExpanded]       = useState(action === "sent");
  const [showRefuse,     setShowRefuse]     = useState(false);
  const [accepting,      startAccept]       = useTransition();
  const [shipping,       startShip]         = useTransition();
  const [confirming,     startConfirm]      = useTransition();

  const isBuyer    = role === "buyer"    || role === "both";
  const isSupplier = role === "supplier" || role === "both";
  // Narrow to proposal-specific role when IDs are available (handles "both" users)
  const isProposalBuyer    = buyerId    ? proposal?.buyer_id    === buyerId    : isBuyer;
  const isProposalSupplier = supplierId ? proposal?.supplier_id === supplierId : isSupplier;
  const cfg        = STATUS[status] ?? STATUS.sent;

  // Event messages (accepted, refused, shipped, completed) → compact pill
  // Use action (immutable) for label — not live status which changes as proposal progresses
  if (action !== "sent") {
    const pillCfg    = STATUS[action] ?? STATUS.sent;
    const hasReason  = action === "refused" && !!refusalReason;
    return (
      <div className={cn(
        "mx-auto rounded-xl border px-3 py-1.5 text-xs w-fit",
        hasReason ? "max-w-sm space-y-0.5" : "max-w-xs flex items-center gap-2",
        pillCfg.cls,
      )}>
        <div className="flex items-center gap-2">
          {pillCfg.icon}
          <span className="font-medium">{pillCfg.label}: {productName}</span>
        </div>
        {hasReason && (
          <p className="text-[11px] italic opacity-80 leading-snug">{refusalReason}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        "rounded-2xl border bg-white shadow-sm overflow-hidden w-full max-w-[280px] md:max-w-sm",
        message.is_mine ? "ml-auto" : "mr-auto",
      )}>
        {/* Header strip */}
        <div className="bg-[color:var(--brand-green-50)] border-b border-[color:var(--brand-green-100)] px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-[color:var(--brand-green-600)] shrink-0" />
            <span className="text-xs font-semibold text-[color:var(--brand-green-700)]">Proposta formal</span>
          </div>
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", cfg.cls)}>
            {cfg.icon}{cfg.label}
          </span>
        </div>

        {/* Content */}
        <div className="px-3 pt-2.5 pb-1 space-y-1">
          <p className="text-sm font-bold text-slate-900 leading-tight">{productName}</p>
          {quantity > 0 && (
            <p className="text-xs text-slate-500">{quantity}{unit ? ` ${unit}` : ""}</p>
          )}
          {targetCents && (
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <DollarSign className="w-3 h-3 text-slate-400 shrink-0" />
              Preço-alvo: <strong className="ml-0.5">{fmt(targetCents)}/un</strong>
            </div>
          )}
          {budgetCents && (
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <DollarSign className="w-3 h-3 text-slate-400 shrink-0" />
              Orçamento: <strong className="ml-0.5">{fmt(budgetCents)}</strong>
            </div>
          )}
          {deadline && (
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <CalendarDays className="w-3 h-3 text-slate-400 shrink-0" />
              Prazo: <strong className="ml-0.5">{new Date(deadline).toLocaleDateString("pt-BR")}</strong>
            </div>
          )}
          {paymentTerms && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <FileText className="w-3 h-3 text-slate-400 shrink-0" />
              {paymentTerms}
            </div>
          )}
        </div>

        {/* Notes toggle */}
        {notes && (
          <div className="px-3 pb-1">
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Observações
            </button>
            {expanded && (
              <p className="mt-1 text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5 italic">{notes}</p>
            )}
          </div>
        )}

        {/* Refusal reason */}
        {status === "refused" && refusalReason && (
          <div className="mx-3 mb-1 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
            <p className="text-[10px] font-semibold text-red-700 mb-0.5 uppercase tracking-wide">Motivo da recusa</p>
            <p className="text-xs text-red-600">{refusalReason}</p>
          </div>
        )}

        {/* Actions — only on latest proposal_ref for this proposal */}
        {isLatest && (
          <div className="px-3 pb-3 pt-1 flex flex-col gap-1.5">
            {/* Supplier accepts/refuses (status = sent) */}
            {isProposalSupplier && status === "sent" && !message.is_mine && (
              <div className="flex gap-1.5">
                <button
                  disabled={accepting}
                  onClick={() => startAccept(async () => {
                    const r = await acceptProposal(proposalId);
                    if (r && "error" in r) toast.error(r.error);
                    else toast.success("Proposta aceita!");
                  })}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  {accepting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                  Aceitar
                </button>
                <button
                  onClick={() => setShowRefuse(true)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors"
                >
                  <XCircle className="w-3 h-3" /> Recusar
                </button>
              </div>
            )}

            {/* Supplier marks shipped (status = accepted) */}
            {isProposalSupplier && status === "accepted" && (
              <button
                disabled={shipping}
                onClick={() => startShip(async () => {
                  const r = await markShipped(proposalId);
                  if (r && "error" in r) toast.error(r.error);
                  else toast.success("Pedido marcado como enviado!");
                })}
                className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {shipping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />}
                Marcar como enviado
              </button>
            )}

            {/* Buyer revises (status = refused) — hide if revision already sent */}
            {isProposalBuyer && status === "refused" && !hasRevision && onRevise && proposal && (
              <button
                onClick={() => onRevise(proposal)}
                className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold transition-colors"
              >
                Revisar e reenviar proposta
              </button>
            )}

            {/* Buyer confirms received (status = shipped) */}
            {isProposalBuyer && status === "shipped" && (
              <button
                disabled={confirming}
                onClick={() => startConfirm(async () => {
                  const r = await confirmReceived(proposalId);
                  if (r && "error" in r) toast.error(r.error);
                  else toast.success("Recebimento confirmado!");
                })}
                className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {confirming ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Confirmar recebimento
              </button>
            )}
          </div>
        )}
      </div>

      {showRefuse && (
        <RefuseModal
          proposalId={proposalId}
          onClose={() => setShowRefuse(false)}
          onDone={() => setShowRefuse(false)}
        />
      )}
    </>
  );
}
