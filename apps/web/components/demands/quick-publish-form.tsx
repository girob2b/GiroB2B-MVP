"use client";

import { useRef, useState } from "react";
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
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [state, setState] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Hint só aparece após o user tentar submeter vazio — não acusa de cara.
  const [showEmptyHint, setShowEmptyHint] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      // UX H-1: botão fica enabled; ao submeter vazio, mostra hint + foca input.
      // Antes: botão disabled sem feedback — user travava sem entender o motivo.
      setShowEmptyHint(true);
      titleInputRef.current?.focus();
      return;
    }
    setSubmitting(true);

    // Monta query params para pré-preencher o form (logado vai pra /painel/postar,
    // anônimo vai pra /postar — guest, limite 1 publicação).
    const params = new URLSearchParams();
    params.set("title", title.trim());
    if (categoryId) params.set("category_id", categoryId);
    if (state) params.set("delivery_state", state);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const targetPath = session ? "/painel/postar" : "/postar";
    router.push(`${targetPath}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="qp-title" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
          O que você precisa comprar? <span className="text-destructive">*</span>
        </label>
        <input
          ref={titleInputRef}
          id="qp-title"
          name="title"
          required
          maxLength={120}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (showEmptyHint && e.target.value.trim()) setShowEmptyHint(false);
          }}
          aria-invalid={showEmptyHint}
          aria-describedby={showEmptyHint ? "qp-title-error" : undefined}
          placeholder="Ex.: 1.000 caixas de papelão 30x40 ondulado"
          className={`h-12 w-full rounded-xl border bg-white px-4 text-sm focus:outline-none focus:ring-2 ${
            showEmptyHint
              ? "border-destructive focus:ring-destructive/30"
              : "border-slate-200 focus:ring-[color:var(--brand-primary-500)]"
          }`}
        />
        {showEmptyHint && (
          <p id="qp-title-error" className="mt-1.5 text-xs font-medium text-destructive">
            Comece pelo título da sua demanda.
          </p>
        )}
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
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
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
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary-500)]"
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
        disabled={submitting}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-primary-600)] px-6 text-sm font-semibold text-white hover:bg-[color:var(--brand-primary-700)] disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Publicar demanda <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
