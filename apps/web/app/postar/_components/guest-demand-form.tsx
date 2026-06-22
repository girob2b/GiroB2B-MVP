"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createGuestDemandAction } from "@/app/actions/demands";

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
];

interface CategoryOption { id: string; name: string; slug: string }
interface Props {
  categories: CategoryOption[];
  defaults: {
    title: string;
    category_id: string;
    delivery_state: string;
    guest_email?: string;
  };
}

export default function GuestDemandForm({ categories, defaults }: Props) {
  const [state, action, pending] = useActionState(createGuestDemandAction, undefined);

  useEffect(() => {
    if (state?.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      {/* Identificação do guest */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Como vão te contatar</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Seu nome" htmlFor="guest_name" required error={state?.errors?.guest_name?.[0]} className="sm:col-span-1">
            <input
              id="guest_name"
              name="guest_name"
              required
              maxLength={120}
              placeholder="Ex.: João Silva"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
            />
          </Field>
          <Field label="Email" htmlFor="guest_email" required error={state?.errors?.guest_email?.[0]}>
            <input
              id="guest_email"
              name="guest_email"
              type="email"
              required
              defaultValue={defaults.guest_email ?? ""}
              placeholder="seu@empresa.com.br"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
            />
          </Field>
          <Field label="WhatsApp" htmlFor="guest_whatsapp" required help="Apenas números com DDD." error={state?.errors?.guest_whatsapp?.[0]}>
            <input
              id="guest_whatsapp"
              name="guest_whatsapp"
              required
              inputMode="numeric"
              pattern="\d{10,14}"
              placeholder="11999999999"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
            />
          </Field>
        </div>
      </section>

      {/* O que precisa */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">O que você precisa comprar</h2>

        <Field label="Título" htmlFor="title" required error={state?.errors?.title?.[0]}>
          <input
            id="title"
            name="title"
            required
            minLength={5}
            maxLength={120}
            defaultValue={defaults.title}
            placeholder="Ex.: 1.000 caixas de papelão"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
          />
        </Field>

        <Field
          label="Descrição"
          htmlFor="description"
          help="Especificação livre. Pode deixar em branco se o título já diz tudo."
        >
          <textarea
            id="description"
            name="description"
            maxLength={5000}
            rows={5}
            placeholder="Detalhes da demanda — quanto mais claro, melhor a qualidade dos contatos."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
          />
        </Field>

        <Field label="Categoria" htmlFor="category_id">
          <select
            id="category_id"
            name="category_id"
            defaultValue={defaults.category_id}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
          >
            <option value="">Selecionar (opcional)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Quantidade" htmlFor="quantity">
            <input
              id="quantity"
              name="quantity"
              type="number"
              min={0}
              step="any"
              placeholder="Ex.: 1000"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
            />
          </Field>
          <Field label="Unidade" htmlFor="unit">
            <input
              id="unit"
              name="unit"
              maxLength={40}
              placeholder="Ex.: unid, kg, m"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
            />
          </Field>
          <Field label="Orçamento (R$)" htmlFor="budget_max_reais">
            <input
              id="budget_max_reais"
              name="budget_max_reais"
              type="number"
              min={0}
              step="0.01"
              placeholder="Ex.: 5000.00"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Prazo desejado" htmlFor="deadline">
            <input
              id="deadline"
              name="deadline"
              type="date"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
            />
          </Field>
          <Field label="Cidade" htmlFor="delivery_city" className="sm:col-span-1">
            <input
              id="delivery_city"
              name="delivery_city"
              maxLength={120}
              placeholder="Ex.: São Paulo"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
            />
          </Field>
          <Field label="UF" htmlFor="delivery_state">
            <select
              id="delivery_state"
              name="delivery_state"
              defaultValue={defaults.delivery_state}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
            >
              <option value="">—</option>
              {BR_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {/* LGPD */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name="lgpd_consent"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[color:var(--brand-primary-600)] focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
          />
          <span className="leading-relaxed">
            Autorizo a publicação desta demanda no GiroB2B e a exibição do meu WhatsApp para
            fornecedores assinantes da plataforma entrarem em contato. Li e aceito a{" "}
            <Link href="/privacidade" target="_blank" className="font-semibold text-[color:var(--brand-primary-700)] underline">
              Política de Privacidade
            </Link>{" "}
            e os{" "}
            <Link href="/termos" target="_blank" className="font-semibold text-[color:var(--brand-primary-700)] underline">
              Termos de Uso
            </Link>
            .
          </span>
        </label>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[color:var(--brand-primary-600)] px-5 text-sm font-semibold text-white hover:bg-[color:var(--brand-primary-700)] disabled:opacity-50"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Publicando…
            </span>
          ) : (
            "Publicar demanda"
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
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  error?: string;
  className?: string;
  /** Adiciona asterisco no label pra sinalizar obrigatoriedade (UX H-2). */
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
      </label>
      {children}
      {help && !error && <p className="mt-1 text-xs text-slate-500">{help}</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
