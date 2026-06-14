"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FileText, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createDemandAction } from "@/app/actions/demands";
import { createClient } from "@/lib/supabase/client";
import type { DemandKind } from "@/lib/schemas/demands";
import DemandPhotosUploader from "./demand-photos-uploader";

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
];

const UNIT_SUGGESTIONS = ["un", "kg", "ton", "L", "m", "m²", "m³", "pç", "cx", "rolo", "fardo"];

interface CategoryOption { id: string; name: string; slug: string }
interface DemandFormProps {
  categories: CategoryOption[];
  defaults: {
    title?: string;
    description?: string;
    category_id?: string;
    whatsapp: string;
    city: string;
    state: string;
    kind?: DemandKind;
  };
}

interface ItemRow {
  description: string;
  quantity: string;
  unit: string;
  specs: string;
}

const emptyItem = (): ItemRow => ({ description: "", quantity: "", unit: "", specs: "" });

const ATTACHMENT_BUCKET = "demand-attachments";
const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export default function DemandForm({ categories, defaults }: DemandFormProps) {
  const [state, action, pending] = useActionState(createDemandAction, undefined);
  const [kind, setKind] = useState<DemandKind>(defaults.kind ?? "simple");

  // Campos controlados — preservam o que o user digitou ao alternar modo.
  // (UXRev 2026-05-14: defaultValue + section condicional perdia dados no toggle.)
  const [title, setTitle] = useState(defaults.title ?? "");
  const [description, setDescription] = useState(defaults.description ?? "");
  const [categoryId, setCategoryId] = useState(defaults.category_id ?? "");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [budgetReais, setBudgetReais] = useState("");
  const [deadline, setDeadline] = useState("");
  const [city, setCity] = useState(defaults.city);
  const [stateUf, setStateUf] = useState(defaults.state);
  const [whatsapp, setWhatsapp] = useState(defaults.whatsapp);
  const [lgpd, setLgpd] = useState(false);

  // Estruturado
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [requiredDocs, setRequiredDocs] = useState("");

  // Anexo PDF — armazenamos o object_path (formato {uid}/{filename.pdf}) e o
  // publicUrl é derivado on-the-fly. RLS bloqueia colisão (SecRev C1).
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (state?.message) toast.error(state.message);
  }, [state]);

  const itemsJson = useMemo(() => {
    if (kind !== "structured") return "";
    return JSON.stringify(
      items
        .filter((it) => it.description.trim().length > 0)
        .map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity.replace(",", ".")),
          unit: it.unit.trim(),
          specs: it.specs.trim() ? it.specs.trim() : null,
        }))
    );
  }, [items, kind]);

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => (prev.length >= 50 ? prev : [...prev, emptyItem()]));
  }

  function removeItem(idx: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function handleAttachmentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF.");
      event.target.value = "";
      return;
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      toast.error("PDF acima de 10 MB. Reduza o arquivo antes de anexar.");
      event.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        toast.error("Sessão expirada. Recarregue a página.");
        return;
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      // crypto.randomUUID() em vez de Date.now() — evita previsibilidade.
      const objectPath = `${authData.user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(objectPath, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) {
        toast.error(uploadError.message || "Falha ao enviar PDF.");
        return;
      }
      setAttachmentPath(objectPath);
      setAttachmentName(file.name);
      toast.success("PDF anexado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar PDF.");
    } finally {
      setUploading(false);
    }
  }

  async function clearAttachment() {
    // Remove o objeto do bucket pra evitar PDF órfão (QARev item órfão).
    if (attachmentPath) {
      try {
        const supabase = createClient();
        await supabase.storage.from(ATTACHMENT_BUCKET).remove([attachmentPath]);
      } catch {
        // Falha silenciosa — limpeza best-effort. Cron job pode pegar depois.
      }
    }
    setAttachmentPath(null);
    setAttachmentName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const attachmentPublicUrl = useMemo(() => {
    if (!attachmentPath) return null;
    const supabase = createClient();
    return supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(attachmentPath).data.publicUrl;
  }, [attachmentPath]);

  const itemsError = state?.errors?.items?.[0];

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="kind" value={kind} />

      {/* Toggle de modo — radiogroup (UXRev: ARIA correto) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-2">
        <div
          role="radiogroup"
          aria-label="Modo de publicação"
          className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold"
        >
          <button
            type="button"
            role="radio"
            aria-checked={kind === "simple"}
            onClick={() => setKind("simple")}
            className={`rounded-lg px-3 py-2 transition-colors ${
              kind === "simple"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Demanda simples
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={kind === "structured"}
            onClick={() => setKind("structured")}
            className={`rounded-lg px-3 py-2 transition-colors ${
              kind === "structured"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Pedido formal
          </button>
        </div>
        <p className="px-2 py-2 text-xs text-slate-500">
          {kind === "simple"
            ? "Demanda descritiva — ideal para cotação rápida ou tirar dúvida com fornecedor."
            : "Pedido formal tipo PO: lista de itens, condições de pagamento/entrega e PDF do pedido (estilo GOV.BR)."}
        </p>
      </section>

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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: 1.000 caixas de papelão 30x40 ondulado"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
          />
        </Field>

        <Field
          label={kind === "structured" ? "Resumo do pedido" : "Descrição (opcional)"}
          htmlFor="description"
          help={
            kind === "simple"
              ? "Especificação livre. Pode deixar em branco se o título e a foto já dizem tudo."
              : "Visão geral do pedido. Os itens detalhados vão no bloco abaixo."
          }
          error={state?.errors?.description?.[0]}
        >
          <textarea
            id="description"
            name="description"
            required={kind === "structured"}
            maxLength={5000}
            rows={kind === "structured" ? 3 : 5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes da demanda — quanto mais claro, melhor a qualidade dos contatos."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
          />
        </Field>

        <Field label="Categoria" htmlFor="category_id" error={state?.errors?.category_id?.[0]}>
          <select
            id="category_id"
            name="category_id"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        {kind === "simple" && (
          <Field
            label="Foto do produto (opcional)"
            htmlFor="photos_urls_json"
            help="Até 3 imagens. JPG, PNG ou WebP até 5 MB cada."
          >
            <DemandPhotosUploader max={3} />
          </Field>
        )}
      </section>

      {/* Itens (somente structured) */}
      {kind === "structured" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Itens do pedido</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Liste cada item separadamente. Mínimo 1, máximo 50.
              </p>
            </div>
            <button
              type="button"
              onClick={addItem}
              disabled={items.length >= 50}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar item
            </button>
          </div>

          <input type="hidden" name="items_json" value={itemsJson} />

          {itemsError && <p className="text-xs text-destructive">{itemsError}</p>}

          <datalist id="unit-suggestions">
            {UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}
          </datalist>

          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:opacity-80"
                      aria-label={`Remover item ${idx + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remover
                    </button>
                  )}
                </div>

                <Field label="Descrição do item" htmlFor={`item-desc-${idx}`}>
                  <input
                    id={`item-desc-${idx}`}
                    value={it.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    maxLength={300}
                    placeholder="Ex.: Caixa papelão ondulado 30x40x25"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantidade" htmlFor={`item-qty-${idx}`}>
                    <input
                      id={`item-qty-${idx}`}
                      type="number"
                      min={0}
                      step="any"
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                      placeholder="Ex.: 1000"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
                    />
                  </Field>
                  <Field label="Unidade" htmlFor={`item-unit-${idx}`}>
                    <input
                      id={`item-unit-${idx}`}
                      list="unit-suggestions"
                      value={it.unit}
                      onChange={(e) => updateItem(idx, { unit: e.target.value })}
                      maxLength={20}
                      placeholder="un, kg, m²…"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
                    />
                  </Field>
                </div>

                <Field
                  label="Especificações técnicas (opcional)"
                  htmlFor={`item-specs-${idx}`}
                  help="Material, dimensões, certificações, tolerância, etc."
                >
                  <textarea
                    id={`item-specs-${idx}`}
                    value={it.specs}
                    onChange={(e) => updateItem(idx, { specs: e.target.value })}
                    maxLength={1000}
                    rows={2}
                    placeholder="Ex.: papelão duplex 350g, impressão 1 cor"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
                  />
                </Field>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Volume & prazo */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">
          {kind === "structured" ? "Prazo e orçamento global" : "Volume e prazo"}
        </h2>
        <div className={`grid grid-cols-1 gap-3 ${kind === "structured" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          {kind === "simple" && (
            <>
              <Field label="Quantidade" htmlFor="quantity">
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={0}
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ex.: 1000"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
                />
              </Field>
              <Field label="Unidade" htmlFor="unit">
                <input
                  id="unit"
                  name="unit"
                  maxLength={40}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Ex.: unid, kg, m"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
                />
              </Field>
            </>
          )}
          <Field
            label={kind === "structured" ? "Orçamento total estimado (R$)" : "Orçamento máximo (R$)"}
            htmlFor="budget_max_reais"
            help="Opcional. Total estimado do pedido."
          >
            <input
              id="budget_max_reais"
              name="budget_max_reais"
              type="number"
              min={0}
              step="0.01"
              value={budgetReais}
              onChange={(e) => setBudgetReais(e.target.value)}
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
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
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
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex.: São Paulo"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
            />
          </Field>
          <Field label="UF" htmlFor="delivery_state" error={state?.errors?.delivery_state?.[0]}>
            <select
              id="delivery_state"
              name="delivery_state"
              value={stateUf}
              onChange={(e) => setStateUf(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
            >
              <option value="">—</option>
              {BR_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {/* Condições e anexo (só structured) */}
      {kind === "structured" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Condições e documentos</h2>

          <Field label="Condições de pagamento" htmlFor="payment_terms" help="Ex.: 30/60/90 dias após entrega, à vista com 5% de desconto, etc.">
            <textarea
              id="payment_terms"
              name="payment_terms"
              maxLength={500}
              rows={2}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
            />
          </Field>

          <Field label="Condições de entrega" htmlFor="delivery_terms" help="Incoterm, endereço, frete CIF/FOB, exigência de coleta, etc.">
            <textarea
              id="delivery_terms"
              name="delivery_terms"
              maxLength={500}
              rows={2}
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
            />
          </Field>

          <Field label="Documentos exigidos" htmlFor="required_docs" help="Certificados ISO, MSDS, NF eletrônica, garantia, etc.">
            <textarea
              id="required_docs"
              name="required_docs"
              maxLength={1000}
              rows={2}
              value={requiredDocs}
              onChange={(e) => setRequiredDocs(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
            />
          </Field>

          <Field label="Anexo (PDF do pedido formal — opcional)" htmlFor="attachment">
            {/* attachment_url = object_path. RLS exige match exato (SecRev C1). */}
            <input type="hidden" name="attachment_url" value={attachmentPath ?? ""} />
            {attachmentPath ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--brand-green-300)] bg-[color:var(--brand-green-50)] px-3 py-2">
                <a
                  href={attachmentPublicUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--brand-green-700)] hover:underline"
                >
                  <FileText className="h-4 w-4" /> {attachmentName ?? "anexo.pdf"}
                </a>
                <button
                  type="button"
                  onClick={clearAttachment}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:opacity-80"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </button>
              </div>
            ) : (
              <label
                htmlFor="attachment"
                className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 hover:border-[color:var(--brand-green-400)] hover:text-[color:var(--brand-green-700)]"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</>
                ) : (
                  <><Upload className="h-4 w-4" /> Selecionar PDF (até 10 MB)</>
                )}
                <input
                  id="attachment"
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={handleAttachmentChange}
                  disabled={uploading}
                />
              </label>
            )}
          </Field>
        </section>
      )}

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
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
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
            checked={lgpd}
            onChange={(e) => setLgpd(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[color:var(--brand-green-600)] focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
          />
          <span className="leading-relaxed">
            Autorizo a publicação desta demanda no GiroB2B e a exibição do meu WhatsApp para
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
          disabled={pending || uploading}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[color:var(--brand-green-600)] px-5 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)] disabled:opacity-50"
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
