"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createDemandAction } from "@/app/actions/demands";

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
];

interface CategoryOption { id: string; name: string; slug: string }
interface DemandFormProps {
  categories: CategoryOption[];
  defaults: { whatsapp: string; city: string; state: string };
}

export default function DemandForm({ categories, defaults }: DemandFormProps) {
  const [state, action, pending] = useActionState(createDemandAction, undefined);

  useEffect(() => {
    if (state?.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      {/* Título e descrição */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">O que você precisa</h2>

        <Field label="Título" htmlFor="title" error={state?.errors?.title?.[0]}>
          <input
            id="title"
            name="title"
            required
            minLength={5}
            maxLength={120}
            placeholder="Ex.: 1.000 caixas de papelão 30x40 ondulado"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
          />
        </Field>

        <Field
          label="Descrição"
          htmlFor="description"
          help="Especifique o produto, qualidade, embalagem, certificações exigidas, etc."
          error={state?.errors?.description?.[0]}
        >
          <textarea
            id="description"
            name="description"
            required
            minLength={20}
            maxLength={5000}
            rows={6}
            placeholder="Detalhes da necessidade — quanto mais claro, melhor a qualidade dos contatos."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
          />
        </Field>

        <Field label="Categoria" htmlFor="category_id" error={state?.errors?.category_id?.[0]}>
          <select
            id="category_id"
            name="category_id"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
            defaultValue=""
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
      </section>

      {/* Quantidade & orçamento */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Volume e prazo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Quantidade" htmlFor="quantity">
            <input
              id="quantity"
              name="quantity"
              type="number"
              min={0}
              step="any"
              placeholder="Ex.: 1000"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
            />
          </Field>
          <Field label="Unidade" htmlFor="unit">
            <input
              id="unit"
              name="unit"
              maxLength={40}
              placeholder="Ex.: unid, kg, m"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
            />
          </Field>
          <Field label="Orçamento máximo (R$)" htmlFor="budget_max_reais" help="Opcional. Total estimado do pedido.">
            <input
              id="budget_max_reais"
              name="budget_max_reais"
              type="number"
              min={0}
              step="0.01"
              placeholder="Ex.: 5000.00"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
            />
          </Field>
        </div>

        <Field label="Prazo desejado" htmlFor="deadline" help="Data até quando você precisa receber.">
          <input
            id="deadline"
            name="deadline"
            type="date"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
          />
        </Field>
      </section>

      {/* Local de entrega */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Onde entregar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Cidade" htmlFor="delivery_city" className="sm:col-span-2">
            <input
              id="delivery_city"
              name="delivery_city"
              maxLength={120}
              defaultValue={defaults.city}
              placeholder="Ex.: São Paulo"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
            />
          </Field>
          <Field label="UF" htmlFor="delivery_state" error={state?.errors?.delivery_state?.[0]}>
            <select
              id="delivery_state"
              name="delivery_state"
              defaultValue={defaults.state}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
            >
              <option value="">—</option>
              {BR_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {/* Contato */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Como vão te contatar</h2>
        <Field
          label="WhatsApp"
          htmlFor="whatsapp_number"
          help="Apenas números, com DDD. Ex.: 11999999999."
          error={state?.errors?.whatsapp_number?.[0]}
        >
          <input
            id="whatsapp_number"
            name="whatsapp_number"
            required
            inputMode="numeric"
            pattern="\d{10,14}"
            defaultValue={defaults.whatsapp}
            placeholder="11999999999"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
          />
        </Field>
      </section>

      {/* LGPD */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name="lgpd_consent"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[color:var(--brand-green-600)] focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
          />
          <span className="leading-relaxed">
            Autorizo a publicação desta necessidade no GiroB2B e a exibição do meu WhatsApp para
            fornecedores assinantes da plataforma entrarem em contato. Li e aceito a{" "}
            <Link href="/privacidade" target="_blank" className="font-semibold text-[color:var(--brand-green-700)] underline">
              Política de Privacidade
            </Link>{" "}
            e os{" "}
            <Link href="/termos" target="_blank" className="font-semibold text-[color:var(--brand-green-700)] underline">
              Termos de Uso
            </Link>
            .
          </span>
        </label>
        {state?.errors?.lgpd_consent?.[0] && (
          <p className="mt-2 text-xs text-destructive">{state.errors.lgpd_consent[0]}</p>
        )}
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href="/painel/necessidades"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[color:var(--brand-green-600)] px-5 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)] disabled:opacity-50"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Publicando…
            </span>
          ) : (
            "Publicar necessidade"
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  help,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}
      </label>
      {children}
      {help && !error && <p className="mt-1 text-xs text-slate-500">{help}</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
