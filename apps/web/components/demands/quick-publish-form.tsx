"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
];

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface QuickPublishFormProps {
  categories: CategoryOption[];
}

export function QuickPublishForm({ categories }: QuickPublishFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [state, setState] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    // Monta query params para pré-preencher /painel/postar
    const postarParams = new URLSearchParams();
    postarParams.set("title", title.trim());
    if (categoryId) postarParams.set("category_id", categoryId);
    if (state) postarParams.set("delivery_state", state);
    const postarUrl = `/painel/postar?${postarParams.toString()}`;

    // Se já está logado, vai direto. Senão, manda pro cadastro com next.
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push(postarUrl);
      return;
    }
    const next = encodeURIComponent(postarUrl);
    router.push(`/cadastro?next=${next}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div>
        <label htmlFor="qp-title" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
          O que você precisa comprar?
        </label>
        <input
          id="qp-title"
          name="title"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: 1.000 caixas de papelão 30x40 ondulado"
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="qp-category" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
            Categoria
          </label>
          <select
            id="qp-category"
            name="category_id"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
          >
            <option value="">Selecionar (opcional)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="qp-state" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
            Estado de entrega
          </label>
          <select
            id="qp-state"
            name="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
          >
            <option value="">Selecionar UF (opcional)</option>
            {BR_STATES.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !title.trim()}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-green-600)] px-6 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)] disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Publicar necessidade <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-xs text-slate-500 leading-relaxed">
        ✨ <strong className="text-slate-700">Dica:</strong> após criar conta, complete seu perfil
        (CNPJ, empresa, telefone) — necessidades de compradores verificados aparecem em destaque
        no feed dos vendedores.
      </p>
    </form>
  );
}
