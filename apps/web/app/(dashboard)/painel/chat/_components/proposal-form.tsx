"use client";

import { useState, useTransition } from "react";
import {
  X, Send, Loader2, Package, Hash, DollarSign,
  CalendarDays, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createProposal } from "@/app/actions/proposals";
import type { CreateProposalInput, ProposalData } from "@/app/actions/proposals";
import { toast } from "sonner";

const UNITS = [
  "unidade","par","caixa","caixa com 12","caixa com 24","fardo",
  "kg","g","litro","ml","metro","m²","m³","pallet","tonelada","dúzia","pacote",
];

const PAYMENT_OPTIONS = [
  "À vista","30 dias","30/60 dias","30/60/90 dias",
  "Boleto bancário","PIX","Cartão de crédito","Transferência bancária",
];

interface ProposalFormProps {
  conversationId: string;
  supplierId: string;
  prefilledProduct?: string | null;
  previousProposal?: ProposalData | null;
  onClose: () => void;
  onSent: (proposalId: string) => void;
}

export default function ProposalForm({
  conversationId,
  supplierId,
  prefilledProduct,
  previousProposal,
  onClose,
  onSent,
}: ProposalFormProps) {
  const prev = previousProposal;
  const [productName,   setProductName]   = useState(prev?.product_name ?? prefilledProduct ?? "");
  const [quantity,      setQuantity]      = useState(prev?.quantity?.toString() ?? "");
  const [unit,          setUnit]          = useState(prev?.unit ?? "");
  const [targetPrice,   setTargetPrice]   = useState(
    prev?.target_price_cents ? (prev.target_price_cents / 100).toFixed(2) : ""
  );
  const [maxBudget,     setMaxBudget]     = useState(
    prev?.max_budget_cents ? (prev.max_budget_cents / 100).toFixed(2) : ""
  );
  const [deadline,      setDeadline]      = useState(prev?.delivery_deadline ?? "");
  const [paymentTerms,  setPaymentTerms]  = useState(prev?.payment_terms ?? "");
  const [notes,         setNotes]         = useState(prev?.notes ?? "");
  const [isPending,     startTransition]  = useTransition();

  const isRevision = !!prev;
  const canSubmit  = productName.trim() && quantity && parseInt(quantity) > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    startTransition(async () => {
      const input: CreateProposalInput = {
        conversation_id:    conversationId,
        supplier_id:        supplierId,
        product_name:       productName.trim(),
        quantity:           parseInt(quantity),
        unit:               unit || null,
        target_price_cents: targetPrice  ? Math.round(parseFloat(targetPrice)  * 100) : null,
        max_budget_cents:   maxBudget    ? Math.round(parseFloat(maxBudget)    * 100) : null,
        delivery_deadline:  deadline     || null,
        payment_terms:      paymentTerms || null,
        notes:              notes.trim() || null,
        parent_id:          prev?.id     ?? null,
      };
      const result = await createProposal(input);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(isRevision ? "Revisão enviada!" : "Proposta enviada!");
        onSent(result.id);
      }
    });
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--brand-green-200)] focus:border-[color:var(--brand-green-400)]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div>
            <p className="font-semibold text-slate-900">
              {isRevision ? "Revisar Proposta" : "Nova Proposta"}
            </p>
            {isRevision && (
              <p className="text-xs text-amber-600 mt-0.5">
                Revisão da proposta recusada — edite e reenvie
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Produto */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Package className="w-3.5 h-3.5" /> Produto *
            </label>
            <input
              autoFocus
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="Ex: Parafuso M8 Inox 25mm"
              className={inputCls}
            />
          </div>

          {/* Quantidade + Unidade */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Hash className="w-3.5 h-3.5" /> Quantidade *
              </label>
              <input
                type="number" min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="1000"
                className={inputCls}
              />
            </div>
            <div className="col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Unidade</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} className={cn(inputCls, "appearance-none")}>
                <option value="">Selecione...</option>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Preços */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <DollarSign className="w-3.5 h-3.5" /> Preço-alvo/un (R$)
              </label>
              <input
                type="number" min="0" step="0.01"
                value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
                placeholder="0,00"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Orçamento máx. (R$)</label>
              <input
                type="number" min="0" step="0.01"
                value={maxBudget}
                onChange={e => setMaxBudget(e.target.value)}
                placeholder="0,00"
                className={inputCls}
              />
            </div>
          </div>

          {/* Prazo */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <CalendarDays className="w-3.5 h-3.5" /> Prazo de entrega desejado
            </label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className={inputCls}
            />
          </div>

          {/* Pagamento */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Condições de pagamento</label>
            <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className={cn(inputCls, "appearance-none")}>
              <option value="">Selecione...</option>
              {PAYMENT_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <FileText className="w-3.5 h-3.5" /> Observações adicionais
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Especificações técnicas, condições especiais, dúvidas..."
              className={cn(inputCls, "resize-none")}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl shrink-0">
          <p className="text-xs text-slate-400">* campos obrigatórios</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isPending}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
                canSubmit && !isPending
                  ? "bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] text-white shadow-sm"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed",
              )}
            >
              {isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
              {isRevision ? "Reenviar proposta" : "Enviar proposta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
