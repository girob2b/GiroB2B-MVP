"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarClock,
  CreditCard,
  DollarSign,
  Loader2,
  Lock,
  MessageSquare,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { contactDemandAction } from "@/app/actions/leads";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPriceBRL } from "@/lib/format-price";
import { OfferPaymentMethod } from "@/lib/schemas/leads";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Labels PT-BR para cada condição de pagamento.
// Espelham OfferPaymentMethod — não duplicar os valores, apenas traduzir.
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  a_vista: "À vista",
  pix: "Pix",
  boleto: "Boleto bancário",
  cartao: "Cartão de crédito/débito",
  parcelado: "Parcelado",
  faturado_30d: "Faturado 30 dias",
};

// Schema do form de oferta — campos de texto/data como string no formulário;
// payment_methods é gerenciado em estado separado (não faz parte deste schema).
const OfferFormSchema = z.object({
  // R$ como string no form; convertemos para centavos (int) antes de enviar.
  priceInput: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v))
    .pipe(
      z
        .string()
        .regex(/^\d+([.,]\d{1,2})?$/, "Informe um valor válido (ex: 1.500,00)")
        .optional()
    ),
  deadline: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v))
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").optional()),
  message: z
    .string()
    .max(300, "Máximo 300 caracteres.")
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v.trim())),
});

type OfferFormValues = z.input<typeof OfferFormSchema>;

/**
 * Converte string R$ (ex: "1.500,00" ou "1500" ou "1500.50") → centavos inteiros.
 * Retorna undefined se a string for vazia/inválida.
 */
function parsePriceToCents(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const value = parseFloat(normalized);
  if (isNaN(value) || value <= 0) return undefined;
  return Math.round(value * 100);
}

interface Props {
  demandId: string;
  canContact: boolean;
  hasSupplier: boolean;
}

export default function ContactButton({ demandId, canContact, hasSupplier }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  // Condições de pagamento selecionadas — gerenciadas aqui para poder resetar
  // junto com o fechamento do dialog (onSuccess).
  const [paymentMethods, setPaymentMethods] = useState<OfferPaymentMethod[]>([]);

  function togglePaymentMethod(method: OfferPaymentMethod) {
    setPaymentMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  }

  function handleSuccess() {
    setOpen(false);
    setPaymentMethods([]);
  }

  // Estado BLOQUEADO — assinatura inativa ou sem cadastro de vendedor.
  // Contraste: text-slate-700 sobre slate-100 com borda slate-300 ≈ 5.9:1 (passa WCAG AA).
  if (!canContact) {
    return (
      <button
        type="button"
        onClick={() => router.push("/seja-vendedor")}
        aria-label={
          hasSupplier
            ? "Assine para enviar cotações para este comprador"
            : "Cadastre-se como vendedor para enviar cotações"
        }
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
      >
        <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
        {hasSupplier ? "Assine para enviar cotações" : "Cadastre-se como vendedor"}
      </button>
    );
  }

  // Estado ATIVO — assinante com subscription_status active ou trialing.
  // CTA primário "Enviar cotação" abre o Dialog com form estruturado.
  // WhatsApp é acionado no submit (dentro do Dialog) — ação secundária ao form.
  return (
    <>
      {/* Trigger: CTA primário — abre o form de cotação */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        aria-label="Enviar cotação para este comprador"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
        Enviar cotação
      </button>

      {/* Dialog de cotação estruturada */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md"
          aria-labelledby="offer-dialog-title"
          aria-describedby="offer-dialog-desc"
        >
          <DialogHeader>
            <DialogTitle id="offer-dialog-title">Enviar cotação</DialogTitle>
            <DialogDescription id="offer-dialog-desc">
              Preencha os campos opcionais da sua cotação — preço, prazo, formas de pagamento e
              uma mensagem curta. Você pode enviar sem preencher nada.
            </DialogDescription>
          </DialogHeader>

          <OfferForm
            demandId={demandId}
            pending={pending}
            startTransition={startTransition}
            onSuccess={handleSuccess}
            paymentMethods={paymentMethods}
            onTogglePaymentMethod={togglePaymentMethod}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Sub-componente: form de cotação ────────────────────────────────────────

interface OfferFormProps {
  demandId: string;
  pending: boolean;
  startTransition: (fn: () => void) => void;
  onSuccess: () => void;
  paymentMethods: OfferPaymentMethod[];
  onTogglePaymentMethod: (method: OfferPaymentMethod) => void;
}

function OfferForm({
  demandId,
  pending,
  startTransition,
  onSuccess,
  paymentMethods,
  onTogglePaymentMethod,
}: OfferFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OfferFormValues>({
    resolver: zodResolver(OfferFormSchema),
    defaultValues: { priceInput: "", deadline: "", message: "" },
  });

  const priceInputValue = watch("priceInput");
  const pricePreview = (() => {
    const cents = parsePriceToCents(priceInputValue);
    return cents !== undefined ? formatPriceBRL(cents) : null;
  })();

  function onSubmit(values: OfferFormValues) {
    const priceCents = parsePriceToCents(values.priceInput);

    // Monta o objeto de oferta — inclui campos não-vazios + payment_methods.
    // Se nenhum campo foi preenchido, enviar undefined (contato simples retrocompatível).
    const offer =
      priceCents !== undefined ||
      values.deadline ||
      values.message ||
      paymentMethods.length > 0
        ? {
            price: priceCents,
            deadline: values.deadline || undefined,
            message: values.message || undefined,
            payment_methods:
              paymentMethods.length > 0 ? paymentMethods : undefined,
          }
        : undefined;

    startTransition(async () => {
      const result = await contactDemandAction(demandId, offer);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      onSuccess();
      window.open(result.whatsappLink, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-4">
        {/* Preço */}
        <div className="space-y-1.5">
          <Label
            htmlFor="offer-price"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
            Preço (R$)
          </Label>
          <div className="relative">
            <Input
              id="offer-price"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 1.500,00"
              aria-describedby={errors.priceInput ? "offer-price-error" : undefined}
              aria-invalid={!!errors.priceInput}
              {...register("priceInput")}
            />
            {pricePreview && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-600 pointer-events-none">
                {pricePreview}
              </span>
            )}
          </div>
          {errors.priceInput && (
            <p id="offer-price-error" role="alert" className="text-xs text-destructive">
              {errors.priceInput.message as string}
            </p>
          )}
        </div>

        {/* Prazo */}
        <div className="space-y-1.5">
          <Label
            htmlFor="offer-deadline"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            Prazo de entrega
          </Label>
          <Input
            id="offer-deadline"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            aria-describedby={errors.deadline ? "offer-deadline-error" : undefined}
            aria-invalid={!!errors.deadline}
            {...register("deadline")}
          />
          {errors.deadline && (
            <p id="offer-deadline-error" role="alert" className="text-xs text-destructive">
              {errors.deadline.message as string}
            </p>
          )}
        </div>

        {/* Formas de pagamento que o vendedor aceita */}
        <fieldset className="space-y-2">
          <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
            Formas de pagamento que você aceita
          </legend>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {OfferPaymentMethod.options.map((method) => (
              <label
                key={method}
                htmlFor={`pm-${method}`}
                className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
              >
                <Checkbox
                  id={`pm-${method}`}
                  checked={paymentMethods.includes(method)}
                  onCheckedChange={() => onTogglePaymentMethod(method)}
                />
                {PAYMENT_METHOD_LABELS[method]}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Mensagem curta */}
        <div className="space-y-1.5">
          <Label
            htmlFor="offer-message"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            Mensagem curta
          </Label>
          <MessageField register={register} errors={errors} watch={watch} />
        </div>
      </div>

      <DialogFooter className="mt-4">
        {/* Submit abre WhatsApp após gravar a cotação — ação principal do Dialog */}
        <Button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-whatsapp-700 px-5 py-3 text-sm font-bold text-white hover:bg-whatsapp-600 focus-visible:ring-whatsapp-700 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <WhatsAppIcon className="h-4 w-4 shrink-0" />
          )}
          {pending ? "Enviando cotação…" : "Enviar cotação e abrir WhatsApp"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Componente auxiliar para o textarea com contador de caracteres.
function MessageField({
  register,
  errors,
  watch,
}: {
  register: ReturnType<typeof useForm<OfferFormValues>>["register"];
  errors: ReturnType<typeof useForm<OfferFormValues>>["formState"]["errors"];
  watch: ReturnType<typeof useForm<OfferFormValues>>["watch"];
}) {
  const message = watch("message") ?? "";
  const charCount = typeof message === "string" ? message.length : 0;

  return (
    <>
      <Textarea
        id="offer-message"
        placeholder="Ex: Entregamos em até 5 dias úteis em todo o Brasil."
        maxLength={300}
        rows={3}
        aria-describedby={`offer-message-counter${errors.message ? " offer-message-error" : ""}`}
        aria-invalid={!!errors.message}
        {...register("message")}
      />
      <div className="flex justify-between">
        {errors.message ? (
          <p id="offer-message-error" role="alert" className="text-xs text-destructive">
            {errors.message.message as string}
          </p>
        ) : (
          <span />
        )}
        <p
          id="offer-message-counter"
          className={`text-xs tabular-nums ${charCount > 280 ? "text-destructive" : "text-slate-400"}`}
          aria-live="polite"
          aria-label={`${charCount} de 300 caracteres`}
        >
          {charCount}/300
        </p>
      </div>
    </>
  );
}
