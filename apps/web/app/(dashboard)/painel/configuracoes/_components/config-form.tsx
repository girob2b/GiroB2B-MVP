"use client";

import { useActionState } from "react";
import { updateCompanySettings } from "@/app/actions/supplier";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2, Repeat } from "lucide-react";

const SITUACAO_FISCAL = [
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "mei",              label: "MEI — Microempreendedor Individual" },
  { value: "lucro_presumido",  label: "Lucro Presumido" },
  { value: "lucro_real",       label: "Lucro Real" },
  { value: "lucro_arbitrado",  label: "Lucro Arbitrado" },
  { value: "imune",            label: "Imune" },
  { value: "isento",           label: "Isento" },
  { value: "outros",           label: "Outros" },
];

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

interface Supplier {
  id: string;
  cnpj: string;
  company_name: string;
  trade_name: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  cep: string | null;
  city: string | null;
  state: string | null;
  inscricao_municipal: string | null;
  inscricao_estadual: string | null;
  situacao_fiscal: string | null;
  plan: string;
  profile_completeness: number;
  is_verified: boolean;
  allow_relisting: boolean;
}

function Field({
  label, name, defaultValue, type = "text", placeholder, readOnly, children,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children ?? (
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          readOnly={readOnly}
          className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)] focus:border-transparent transition read-only:bg-slate-50 read-only:text-slate-500 read-only:cursor-not-allowed"
        />
      )}
    </div>
  );
}

export default function ConfigForm({ supplier, userRole }: { supplier: Supplier, userRole?: string }) {
  const [state, action, pending] = useActionState(updateCompanySettings, {});

  const ROLE_LABELS: Record<string, string> = {
    buyer: "Comprador",
    supplier: "Vendedor",
    both: "Ambos",
  };

  const PLAN_LABELS: Record<string, { label: string; color: string }> = {
    free:    { label: "Gratuito", color: "bg-slate-100 text-slate-600 border-slate-200" },
    starter: { label: "Starter",  color: "bg-slate-100 text-slate-700 border-slate-200" },
    pro:     { label: "Pro",      color: "bg-[color:var(--brand-green-100)] text-[color:var(--brand-green-700)] border-[color:var(--brand-green-200)]" },
    premium: { label: "Premium",  color: "bg-[color:var(--brand-green-100)] text-[color:var(--brand-green-700)] border-[color:var(--brand-green-200)]" },
  };
  const plan = PLAN_LABELS[supplier.plan] ?? PLAN_LABELS.free;

  return (
    <div className="space-y-6">
      {/* ── Card de perfil (movido da sidebar) ── */}
      <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Perfil da empresa</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[color:var(--brand-green-100)] flex items-center justify-center text-[color:var(--brand-green-700)] font-bold text-2xl shrink-0 border border-[color:var(--brand-green-200)]">
            {supplier.trade_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="font-semibold text-slate-900">{supplier.trade_name}</p>
              <p className="text-xs text-slate-500 truncate">{supplier.company_name}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)] border border-[color:var(--brand-green-200)]">
                {userRole ? (ROLE_LABELS[userRole] ?? userRole) : "Vendedor"}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.color}`}>
                {plan.label}
              </span>
              {supplier.is_verified && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verificado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Barra de completude */}
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Completude do perfil público</span>
            <span className="font-semibold text-slate-700">{supplier.profile_completeness}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand-green-500),var(--brand-green-600))] transition-all"
              style={{ width: `${supplier.profile_completeness}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {supplier.profile_completeness < 100
              ? "Complete as informações abaixo para aumentar sua visibilidade."
              : "Perfil completo! Você aparece com destaque nas buscas."}
          </p>
        </div>
      </div>

      {/* ── Formulário ── */}
      <form action={action} className="space-y-6">

        {/* Feedback */}
        {state.success && (
          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] px-4 py-3 text-sm text-[color:var(--brand-green-700)]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Informações salvas com sucesso.
          </div>
        )}
        {state.error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {state.error}
          </div>
        )}

        {/* Identificação */}
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Identificação</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="CNPJ" name="cnpj" defaultValue={supplier.cnpj} readOnly />
            <Field label="Razão social" name="company_name" defaultValue={supplier.company_name} readOnly />
            <Field label="Nome fantasia" name="trade_name" defaultValue={supplier.trade_name} readOnly
              placeholder="Nome comercial" />
            <Field label="Telefone" name="phone" defaultValue={supplier.phone} placeholder="(11) 99999-9999" />
            <Field label="WhatsApp" name="whatsapp" defaultValue={supplier.whatsapp} placeholder="(11) 99999-9999" />
          </div>
          <p className="text-xs text-slate-400">CNPJ, razão social e nome fantasia não podem ser alterados aqui. Entre em contato com o suporte.</p>
        </div>

        {/* Endereço */}
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Endereço</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Logradouro" name="address" defaultValue={supplier.address} placeholder="Rua, número, complemento" />
            </div>
            <Field label="CEP" name="cep" defaultValue={supplier.cep} placeholder="00000-000" />
            <Field label="Cidade" name="city" defaultValue={supplier.city} placeholder="São Paulo" />
            <Field label="Estado" name="state" defaultValue={supplier.state}>
              <select
                id="state"
                name="state"
                defaultValue={supplier.state ?? ""}
                className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)] focus:border-transparent transition"
              >
                <option value="">Selecione o estado</option>
                {ESTADOS.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Dados fiscais */}
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Dados fiscais</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Inscrição Municipal" name="inscricao_municipal" defaultValue={supplier.inscricao_municipal} placeholder="000000-0" />
            <Field label="Inscrição Estadual" name="inscricao_estadual" defaultValue={supplier.inscricao_estadual} placeholder="000.000.000.000" />
            <div className="sm:col-span-2">
              <Field label="Regime tributário / Situação fiscal" name="situacao_fiscal" defaultValue={supplier.situacao_fiscal ?? ""}>
                <select
                  id="situacao_fiscal"
                  name="situacao_fiscal"
                  defaultValue={supplier.situacao_fiscal ?? ""}
                  className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)] focus:border-transparent transition"
                >
                  <option value="">Selecione o regime tributário</option>
                  {SITUACAO_FISCAL.map(sf => (
                    <option key={sf.value} value={sf.value}>{sf.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </div>

        {/* Revenda de produtos (opt-in) */}
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-amber-600" />
            <h2 className="text-base font-semibold text-slate-900">Revenda de produtos</h2>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              name="allow_relisting"
              value="true"
              defaultChecked={supplier.allow_relisting}
              className="mt-1 w-4 h-4 rounded border-slate-300 text-[color:var(--brand-green-600)] focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
            />
            <span className="flex-1">
              <span className="block text-sm font-medium text-slate-800 group-hover:text-slate-900">
                Permitir que outros fornecedores relistem meus produtos
              </span>
              <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
                Ao ativar, outros fornecedores da plataforma podem copiar a imagem e o nome dos seus produtos para o catálogo deles.
                Você continua recebendo as suas próprias cotações normalmente — as cópias pertencem a eles. Pode desativar a qualquer momento;
                cópias já feitas permanecem. Ao ativar, você confirma que possui os direitos de uso das imagens publicadas.
              </span>
            </span>
          </label>
        </div>

        {/* Salvar */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={pending}
            className="btn-primary h-11 px-10 rounded-xl font-bold min-w-40"
          >
            {pending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
