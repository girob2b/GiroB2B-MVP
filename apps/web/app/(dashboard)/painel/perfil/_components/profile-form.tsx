"use client";

import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import RoleModeCard from "@/components/profile/role-mode-card";
import {
  updateBuyerProfile,
  updateBuyerHabits,
  type UpdateBuyerProfileState,
  type UpdateBuyerHabitsState,
} from "@/app/actions/user";
import AccountForm, { type AccountFormSupplier } from "./account-form";

export interface Buyer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  company_name: string | null;
  cnpj: string | null;
  inscricao_municipal: string | null;
  inscricao_estadual: string | null;
  address: string | null;
  cep: string | null;
  purchase_frequency: string | null;
  is_company_verified: boolean;
}

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const FREQUENCY_OPTIONS = [
  { value: "weekly",        label: "Toda semana" },
  { value: "monthly",       label: "Toda mês" },
  { value: "quarterly",     label: "A cada 3 meses" },
  { value: "occasional",    label: "Eventualmente" },
  { value: "project_based", label: "Por projeto" },
];

function maskCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskCep(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

function isProfileComplete(b: Buyer) {
  return Boolean(b.cnpj && b.company_name && b.phone && b.address && b.cep && b.city && b.state);
}

function Field({
  label, name, defaultValue, type = "text", placeholder, readOnly, required, onChange, autoFormat, children,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoFormat?: (v: string) => string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}{required && <span className="text-destructive"> *</span>}
      </label>
      {children ?? (
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          readOnly={readOnly}
          inputMode={autoFormat ? "numeric" : undefined}
          onChange={(e) => {
            if (autoFormat) e.currentTarget.value = autoFormat(e.currentTarget.value);
            onChange?.(e);
          }}
          className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition read-only:bg-slate-50 read-only:text-slate-500 read-only:cursor-not-allowed"
        />
      )}
    </div>
  );
}

const initialBuyerState: UpdateBuyerProfileState = {};
const initialHabitsState: UpdateBuyerHabitsState = {};

type PendingRoleRequest = {
  id: string;
  current_mode: "buyer" | "supplier" | "both";
  target_mode: "buyer" | "supplier" | "both";
  requested_at: string;
};

type View = "buyer" | "supplier";

function CompanyDataForm({ buyer }: { buyer: Buyer }) {
  const [state, formAction, pending] = useActionState(updateBuyerProfile, initialBuyerState);

  useEffect(() => {
    if (state.success) toast.success("Dados da empresa atualizados.");
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Dados da empresa</CardTitle>
            {buyer.is_company_verified ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] px-2.5 py-1 text-xs font-semibold text-[color:var(--brand-green-700)]"
                title="CNPJ ativo na Receita Federal — fornecedores veem este selo nas suas cotações."
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Empresa Verificada
              </span>
            ) : buyer.cnpj ? (
              <span className="text-xs text-muted-foreground">
                CNPJ pendente de validação
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Plataforma B2B — esses dados aparecem nas cotações que você envia e no histórico de negociações.
            {!buyer.is_company_verified && (
              <span className="block mt-1">
                Informe um CNPJ ativo para conquistar o selo <strong>Empresa Verificada</strong> e
                aumentar suas chances de resposta.
              </span>
            )}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do contato" name="name" defaultValue={buyer.name} placeholder="Seu nome" required />
            <Field label="Email" name="email" defaultValue={buyer.email} readOnly />
            <Field label="Telefone / WhatsApp" name="phone" defaultValue={buyer.phone} placeholder="(11) 99999-9999" required />
            <Field label="Razão social" name="company_name" defaultValue={buyer.company_name} placeholder="Nome jurídico" required />
            <Field
              label="CNPJ"
              name="cnpj"
              defaultValue={buyer.cnpj ? maskCnpj(buyer.cnpj) : ""}
              placeholder="00.000.000/0000-00"
              autoFormat={maskCnpj}
              required
            />
            <Field
              label="CEP"
              name="cep"
              defaultValue={buyer.cep ? maskCep(buyer.cep) : ""}
              placeholder="00000-000"
              autoFormat={maskCep}
              required
            />
            <Field label="Inscrição municipal" name="inscricao_municipal" defaultValue={buyer.inscricao_municipal} placeholder="" />
            <Field label="Inscrição estadual" name="inscricao_estadual" defaultValue={buyer.inscricao_estadual} placeholder="Isento, se aplicável" />
            <div className="sm:col-span-2">
              <Field label="Endereço" name="address" defaultValue={buyer.address} placeholder="Rua, número, bairro" required />
            </div>
            <Field label="Cidade" name="city" defaultValue={buyer.city} placeholder="Ex: São Paulo" required />
            <Field label="Estado" name="state" required>
              <select
                id="state"
                name="state"
                defaultValue={buyer.state ?? ""}
                className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              >
                <option value="">Selecione</option>
                {ESTADOS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        {state.success && (
          <p className="flex items-center gap-2 text-sm text-brand-700">
            <CheckCircle2 className="h-4 w-4" />
            Salvo
          </p>
        )}
        <Button type="submit" disabled={pending} className="btn-primary ml-auto">
          {pending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </span>
          ) : (
            "Salvar dados da empresa"
          )}
        </Button>
      </div>
    </form>
  );
}

function BuyerHabitsForm({ buyer }: { buyer: Buyer }) {
  const [state, formAction, pending] = useActionState(updateBuyerHabits, initialHabitsState);

  useEffect(() => {
    if (state.success) toast.success("Hábito de compra atualizado.");
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hábito de compra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Ajuda fornecedores a entenderem seu volume e prioridade.
          </p>
          <Field label="Frequência de compra" name="purchase_frequency">
            <select
              id="purchase_frequency"
              name="purchase_frequency"
              defaultValue={buyer.purchase_frequency ?? ""}
              className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
            >
              <option value="">Selecione</option>
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="btn-primary">
          {pending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </span>
          ) : (
            "Salvar hábito de compra"
          )}
        </Button>
      </div>
    </form>
  );
}

function ViewSwitcher({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const options: { value: View; label: string; icon: typeof ShoppingBag }[] = [
    { value: "buyer",    label: "Perfil como Comprador", icon: ShoppingBag },
    { value: "supplier", label: "Perfil como Vendedor",  icon: Store },
  ];
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-slate-50 p-1">
      {options.map(({ value, label, icon: Icon }) => {
        const active = view === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function ProfileForm({
  buyer,
  supplier,
  hasRealBuyer,
  lastRoleChangeAt,
  pendingRoleRequest,
  initialSegmentChosen,
}: {
  buyer: Buyer;
  supplier: AccountFormSupplier | null;
  hasRealBuyer: boolean;
  lastRoleChangeAt: string | null;
  pendingRoleRequest: PendingRoleRequest | null;
  initialSegmentChosen: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasSupplier = !!supplier;
  // `buyer` aqui pode ser uma row real OU derivada do supplier (em supplier-only).
  // O ViewSwitcher e BuyerHabitsForm só fazem sentido se houver buyer REAL.
  const hasBuyer = hasRealBuyer;
  const isBoth = hasSupplier && hasBuyer;
  const currentMode: "buyer" | "supplier" | "both" =
    isBoth ? "both" : hasSupplier ? "supplier" : "buyer";

  // View ativa via URL (?view=buyer|supplier). Default = "buyer" pra ambos.
  const rawView = searchParams.get("view");
  const view: View = rawView === "supplier" ? "supplier" : "buyer";

  function setView(next: View) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "buyer") params.delete("view");
    else params.set("view", next);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  const initials = (buyer.name ?? buyer.email).slice(0, 1).toUpperCase();
  const profileComplete = isProfileComplete(buyer);

  // Pra single-role, força a view correspondente (ignora ?view=)
  const effectiveView: View = isBoth ? view : (hasSupplier ? "supplier" : "buyer");

  return (
    <div className="space-y-6">
      {/* Header com avatar + identidade */}
      <div className="flex items-center gap-4 rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white text-lg font-bold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-foreground truncate">
            {buyer.name ?? "Sem nome"}
          </p>
          <p className="text-xs text-muted-foreground truncate">{buyer.email}</p>
        </div>
      </div>

      {/* Aviso de cadastro incompleto — gate B2B */}
      {!profileComplete && (
        <div className="alert-warning text-sm">
          <strong>Complete seu cadastro pra poder enviar cotações.</strong>{" "}
          A plataforma é B2B — preencha CNPJ, razão social e endereço da empresa abaixo.
        </div>
      )}

      {/* 1. Dados da empresa — sempre, fixo pra todos */}
      <CompanyDataForm buyer={buyer} />

      {/* 2. Modo de uso — sempre, fixo pra todos */}
      <RoleModeCard
        currentMode={currentMode}
        hasSupplier={hasSupplier}
        lastRoleChangeAt={lastRoleChangeAt}
        pendingRoleRequest={pendingRoleRequest}
        initialSegmentChosen={initialSegmentChosen}
      />

      {/* 3. Switch de visão (só pra "ambos") */}
      {isBoth && <ViewSwitcher view={effectiveView} onChange={setView} />}

      {/* 4. Conteúdo da face ativa */}
      {effectiveView === "buyer" && hasBuyer && (
        <BuyerHabitsForm buyer={buyer} />
      )}

      {effectiveView === "supplier" && hasSupplier && supplier && (
        <AccountForm
          supplier={supplier}
          userRole={isBoth ? "both" : "supplier"}
        />
      )}
    </div>
  );
}
