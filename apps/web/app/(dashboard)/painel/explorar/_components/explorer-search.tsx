"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Search, MapPin, Package, X, ChevronLeft, ChevronRight,
  MessageSquare, DollarSign, Scale, Store,
  Trash2, LayoutList, LayoutGrid,
  CheckCircle2, Loader2, AlertCircle,
  ChevronDown, Globe, Zap, ClipboardList,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiClient } from "@/lib/api-client";
import { createOrGetConversation } from "@/app/actions/chat";
import WebSearchPanel from "./web-search-panel";
import NeedsDialog from "./needs-dialog";
import { RecentNeedsSuggestions } from "./recent-needs-suggestions";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchProduct {
  id: string;
  supplier_id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  category_slug: string | null;
  category_name: string | null;
  images: string[] | null;
  unit: string | null;
  min_order: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  tags: string[] | null;
  supplier_name: string;
  supplier_slug: string;
  supplier_city: string;
  supplier_state: string;
  supplier_logo: string | null;
  is_verified: boolean;
  supplier_plan: string;
  supplier_type: string | null;
  created_at: string;
}

interface SearchResponse {
  products: SearchProduct[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Pending proposal (persistência entre autenticação) ──────────────────────

const PENDING_PROPOSAL_KEY = "girob2b_pending_proposal";

type OriginPreference = "national" | "imported" | "any";
type FreightPayer = "buyer" | "supplier" | "split" | "negotiable";
type FreightType = "carrier" | "own_freight" | "pickup" | "negotiable";

interface ProposalFormState {
  quantity: string;
  targetPrice: string;
  desiredDeadline: string;
  materialType: string;
  originPreference: OriginPreference;
  freightPayer: FreightPayer;
  freightType: FreightType;
  notes: string;
  showForm: boolean;
}

interface PendingProposal {
  product: SearchProduct;
  formState: ProposalFormState;
  timestamp: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 400;

export const CATEGORIAS = [
  { slug: "embalagens",             nome: "Embalagens" },
  { slug: "alimentos-bebidas",      nome: "Alimentos e Bebidas" },
  { slug: "materiais-construcao",   nome: "Materiais de Construção" },
  { slug: "textil-confeccao",       nome: "Têxtil e Confecção" },
  { slug: "autopecas",              nome: "Autopeças" },
  { slug: "industria-manufatura",   nome: "Indústria e Manufatura" },
  { slug: "tecnologia-informatica", nome: "Tecnologia e Informática" },
  { slug: "servicos-empresariais",  nome: "Serviços Empresariais" },
  { slug: "limpeza-higiene",        nome: "Limpeza e Higiene" },
  { slug: "agronegocio",            nome: "Agronegócio" },
];

const ESTADOS_BR = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
];

const MOQ_OPTIONS = [
  { label: "Qualquer quantidade", min: 0,    max: null },
  { label: "Até 100 unidades",    min: 0,    max: 100 },
  { label: "Até 500 unidades",    min: 0,    max: 500 },
  { label: "Até 1.000 unidades",  min: 0,    max: 1000 },
  { label: "Acima de 1.000",      min: 1001, max: null },
];

// Varejista excluído — vende para consumidor final (B2C), não se aplica ao B2B
const SUPPLIER_TYPES = [
  { slug: "fabricante",   label: "Fabricante" },
  { slug: "importador",   label: "Importador" },
  { slug: "distribuidor", label: "Distribuidor" },
  { slug: "atacado",      label: "Atacado" },
];

const POPULAR_SEARCHES = [
  "Embalagens plásticas", "Parafusos", "Tecidos", "Materiais de limpeza",
  "Equipamentos industriais", "Alimentos a granel",
];

const CAT_BG: Record<string, string> = {
  embalagens:               "bg-sky-100",
  "alimentos-bebidas":      "bg-orange-100",
  "materiais-construcao":   "bg-stone-100",
  "textil-confeccao":       "bg-pink-100",
  autopecas:                "bg-zinc-100",
  "industria-manufatura":   "bg-slate-100",
  "tecnologia-informatica": "bg-indigo-100",
  "servicos-empresariais":  "bg-blue-100",
  agronegocio:              "bg-[color:var(--brand-green-100)]",
  "limpeza-higiene":        "bg-teal-100",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(cents: number | null | undefined): string {
  if (!cents) return "a negociar";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function centsToInput(cents: number | null | undefined): string {
  if (!cents) return "";
  return String(cents / 100);
}

function formatPriceDraft(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "a negociar";
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : trimmed;
}

function catBg(slug: string | null): string {
  return CAT_BG[slug ?? ""] ?? "bg-slate-100";
}

function hasRealInquiryIds(p: SearchProduct): boolean {
  return Boolean(p.id && p.supplier_id);
}

// ─── Filter state ─────────────────────────────────────────────────────────────

interface Filters {
  query: string;
  category: string;
  state: string;
  moqIndex: number;
  sortBy: "recent" | "price" | "moq";
  supplierTypes: string[];
}

const DEFAULT_FILTERS: Filters = {
  query: "", category: "", state: "", moqIndex: 0, sortBy: "recent", supplierTypes: [],
};

// ─── FilterDropdown ───────────────────────────────────────────────────────────

function FilterDropdown({
  label,
  selectedLabel,
  onClear,
  children,
}: {
  label: string;
  selectedLabel?: string;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const isActive = !!selectedLabel;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-medium whitespace-nowrap transition-colors ${
          isActive
            ? "border-[color:var(--brand-green-400)] bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)]"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
        }`}
      >
        <span className="max-w-[120px] truncate">{selectedLabel ?? label}</span>
        {isActive && onClear ? (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false); }}
            className="ml-0.5 cursor-pointer text-[color:var(--brand-green-500)] hover:text-[color:var(--brand-green-700)]"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        )}
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 min-w-[170px] max-h-72 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
        active
          ? "bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)] font-medium"
          : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
        active
          ? "bg-[color:var(--brand-green-600)] border-[color:var(--brand-green-600)]"
          : "border-slate-300"
      }`}>
        {active && <X className="w-2 h-2 text-white" />}
      </span>
      {label}
    </button>
  );
}

// ─── Card lista ───────────────────────────────────────────────────────────────

function ProdutoCardList({
  p, onClick, onCompare, inCompare,
}: {
  p: SearchProduct;
  onClick: () => void;
  onCompare: () => void;
  inCompare: boolean;
}) {
  const bg = catBg(p.category_slug);
  const img = p.images?.[0];

  return (
    <div
      className={`flex gap-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all p-4 ${
        inCompare
          ? "border-[color:var(--brand-green-400)] ring-2 ring-[color:var(--brand-green-100)]"
          : "border-border hover:border-[color:var(--brand-green-200)]"
      }`}
    >
      <button
        onClick={onClick}
        className={`w-20 h-20 shrink-0 rounded-lg ${bg} flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity`}
      >
        {img ? (
          <Image src={img} alt={p.name} width={80} height={80} className="w-20 h-20 object-cover" unoptimized />
        ) : (
          <Package className="w-7 h-7 text-slate-400" />
        )}
      </button>

      <button onClick={onClick} className="flex-1 min-w-0 text-left space-y-1 hover:text-inherit">
        <h3 className="font-semibold text-slate-900 text-sm leading-tight hover:text-[color:var(--brand-green-700)] transition-colors">
          {p.name}
        </h3>
        <p className="text-xs text-slate-500 font-medium">{p.supplier_name}</p>
        {p.description && (
          <p className="text-xs text-slate-400 line-clamp-1">{p.description}</p>
        )}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap pt-0.5">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {p.supplier_city}, {p.supplier_state}
          </span>
          {p.min_order && (
            <span className="flex items-center gap-1 font-medium text-slate-600">
              PMO: {p.min_order.toLocaleString("pt-BR")} {p.unit ?? "unid"}
            </span>
          )}
          {p.category_name && (
            <span className="flex items-center gap-1">{p.category_name}</span>
          )}
          {p.supplier_type && (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium capitalize">
              {p.supplier_type}
            </span>
          )}
        </div>
      </button>

      <div className="shrink-0 flex flex-col items-end justify-between gap-3 min-w-[140px]">
        <div className="text-right">
          <p className="text-[10px] text-slate-400">A partir de</p>
          <p className="text-sm font-bold text-slate-900 tabular-nums leading-tight">
            {formatBRL(p.price_min_cents)}
          </p>
          {p.price_max_cents && p.price_max_cents !== p.price_min_cents && (
            <p className="text-[11px] text-slate-500 tabular-nums">
              até {formatBRL(p.price_max_cents)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 w-full">
          <button
            onClick={onClick}
            className="flex items-center justify-center gap-1.5 h-8 rounded-lg bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] text-white text-xs font-semibold transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Solicitar cotação
          </button>
          <button
            onClick={onCompare}
            className={`flex items-center justify-center gap-1.5 h-7 rounded-lg border text-xs font-medium transition-colors ${
              inCompare
                ? "border-[color:var(--brand-green-400)] bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)]"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <Scale className="w-3 h-3" />
            {inCompare ? "Adicionado" : "Comparar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card grid ────────────────────────────────────────────────────────────────

function ProdutoCardGrid({
  p, onClick, onCompare, inCompare,
}: {
  p: SearchProduct;
  onClick: () => void;
  onCompare: () => void;
  inCompare: boolean;
}) {
  const bg = catBg(p.category_slug);
  const img = p.images?.[0];

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden ${
        inCompare
          ? "border-[color:var(--brand-green-400)] ring-2 ring-[color:var(--brand-green-100)]"
          : "border-border hover:border-[color:var(--brand-green-200)]"
      }`}
    >
      <button
        onClick={onClick}
        className={`w-full aspect-[4/3] ${bg} flex items-center justify-center relative overflow-hidden`}
      >
        {img ? (
          <Image src={img} alt={p.name} fill className="object-cover" unoptimized />
        ) : (
          <Package className="w-8 h-8 text-slate-400" />
        )}
        {inCompare && (
          <span className="absolute top-2 left-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[color:var(--brand-green-600)] text-white">
            Comparando
          </span>
        )}
      </button>
      <button onClick={onClick} className="p-3 text-left flex-1 space-y-1 hover:text-inherit">
        <p className="text-xs font-semibold text-slate-900 line-clamp-2 hover:text-[color:var(--brand-green-700)] transition-colors">
          {p.name}
        </p>
        <p className="text-[11px] text-slate-500 truncate">{p.supplier_name}</p>
        <div className="pt-1 space-y-0.5">
          <p className="text-[10px] text-slate-400">A partir de</p>
          <p className="text-sm font-bold text-slate-900 tabular-nums">
            {formatBRL(p.price_min_cents)}
            <span className="text-[10px] font-normal text-slate-400">
              {p.unit ? `/${p.unit}` : ""}
            </span>
          </p>
          {p.min_order && (
            <p className="text-[10px] text-slate-500">
              PMO: {p.min_order.toLocaleString("pt-BR")} {p.unit ?? "unid"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-0.5">
          <MapPin className="w-2.5 h-2.5 shrink-0" />
          {p.supplier_state}
        </div>
      </button>
      <div className="px-3 pb-3 flex gap-1.5">
        <button
          onClick={onClick}
          className="flex-1 h-7 rounded-lg bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] text-white text-[11px] font-semibold transition-colors"
        >
          Solicitar cotação
        </button>
        <button
          onClick={onCompare}
          className={`h-7 w-8 rounded-lg border flex items-center justify-center transition-colors ${
            inCompare
              ? "border-[color:var(--brand-green-400)] bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-600)]"
              : "border-slate-200 text-slate-500 hover:border-slate-300"
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

type CreateInquiryApiResponse = {
  success: true;
  deduplicated: boolean;
  supplier_name: string;
  inquiry: { id: string };
};

function ProdutoModal({
  p, onClose, onCompare, inCompare, initialFormState,
}: {
  p: SearchProduct;
  onClose: () => void;
  onCompare: (p: SearchProduct) => void;
  inCompare: boolean;
  initialFormState?: ProposalFormState | null;
}) {
  const router = useRouter();
  const bg = catBg(p.category_slug);
  const img = p.images?.[0];

  const [showForm, setShowForm] = useState(initialFormState?.showForm ?? false);
  const [quantity, setQuantity] = useState(initialFormState?.quantity ?? String(p.min_order ?? 1));
  const [targetPrice, setTargetPrice] = useState(initialFormState?.targetPrice ?? centsToInput(p.price_min_cents));
  const [desiredDeadline, setDesiredDeadline] = useState(initialFormState?.desiredDeadline ?? "");
  const [materialType, setMaterialType] = useState(initialFormState?.materialType ?? (p.category_name ?? ""));
  const [originPreference, setOriginPreference] = useState<OriginPreference>(initialFormState?.originPreference ?? "national");
  const [freightPayer, setFreightPayer] = useState<FreightPayer>(initialFormState?.freightPayer ?? "negotiable");
  const [freightType, setFreightType] = useState<FreightType>(initialFormState?.freightType ?? "carrier");
  const [notes, setNotes] = useState(initialFormState?.notes ?? "");
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "sent">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [directContactLoading, setDirectContactLoading] = useState(false);

  function buildDescription() {
    return [
      `Tenho interesse em negociar a compra de ${quantity || "quantidade a definir"} ${p.unit ?? "unid"} de ${p.name}.`,
      targetPrice ? `Preço alvo: ${formatPriceDraft(targetPrice)} por ${p.unit ?? "unid"}.` : "",
      desiredDeadline ? `Prazo desejado: ${desiredDeadline}.` : "",
      `Tipo de material/especificação: ${materialType || p.category_name || "a definir"}.`,
      `Origem preferida: ${{ national: "Mercado nacional", imported: "Importação", any: "Aberto a ambos" }[originPreference]}.`,
      `Frete: ${{ buyer: "Comprador paga", supplier: "Fornecedor paga", split: "Dividir frete", negotiable: "Negociável" }[freightPayer]} — ${{ carrier: "Transportadora", own_freight: "Frete próprio", pickup: "Retirada", negotiable: "Negociável" }[freightType].toLowerCase()}.`,
      notes ? `Observações: ${notes}` : "",
    ].filter(Boolean).join("\n");
  }

  function saveAndRedirect() {
    const pending: PendingProposal = {
      product: p,
      formState: { quantity, targetPrice, desiredDeadline, materialType, originPreference, freightPayer, freightType, notes, showForm: true },
      timestamp: Date.now(),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(PENDING_PROPOSAL_KEY, JSON.stringify(pending));
    }
    const redirectTo = typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/explorar";
    router.push(`/cadastro?redirect=${encodeURIComponent(redirectTo)}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitState("submitting");

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        saveAndRedirect();
        return;
      }

      const client = apiClient(session.access_token);
      const description = buildDescription();

      const result = await client.post<CreateInquiryApiResponse>("/inquiries", {
        supplier_id: p.supplier_id,
        product_id: p.id,
        description,
        quantity_estimate: `${quantity} ${p.unit ?? "unid"}`,
        desired_deadline: desiredDeadline || undefined,
        lgpd_consent: true,
      });

      const convResult = await createOrGetConversation({
        supplierId: p.supplier_id,
        inquiryId: result.inquiry.id,
        productId: p.id,
        productName: p.name,
        contextType: "inquiry",
        firstMessage: description,
      });

      setSubmitState("sent");
      if ("id" in convResult) {
        router.push(`/painel/chat?conv=${convResult.id}`);
      } else {
        router.push(`/painel/inquiries/${result.inquiry.id}`);
      }
      onClose();
    } catch (err) {
      setSubmitState("idle");
      setSubmitError(err instanceof Error ? err.message : "Não foi possível enviar a cotação.");
    }
  }

  async function handleDirectContact() {
    if (!hasRealInquiryIds(p)) return;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      saveAndRedirect();
      return;
    }
    setDirectContactLoading(true);
    try {
      const convResult = await createOrGetConversation({
        supplierId: p.supplier_id,
        productId: p.id,
        productName: p.name,
        contextType: "direct_purchase",
      });
      if ("id" in convResult) {
        router.push(`/painel/chat?conv=${convResult.id}`);
        onClose();
      } else {
        setSubmitError(convResult.error);
      }
    } catch {
      setSubmitError("Não foi possível abrir o chat.");
    } finally {
      setDirectContactLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header image */}
        <div className={`w-full h-40 ${bg} relative flex items-center justify-center overflow-hidden`}>
          {img ? (
            <Image src={img} alt={p.name} fill className="object-cover" unoptimized />
          ) : (
            <Package className="w-12 h-12 text-slate-400" />
          )}
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white shadow transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">{p.name}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{p.supplier_name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {p.is_verified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--brand-green-700)]">
                    <CheckCircle2 className="w-3 h-3" /> Verificada
                  </span>
                )}
                {p.supplier_type && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium capitalize">
                    {p.supplier_type}
                  </span>
                )}
              </div>
            </div>
          </div>

          {p.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{p.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Faixa de preço",
                value: p.price_min_cents
                  ? `${formatBRL(p.price_min_cents)}${p.price_max_cents && p.price_max_cents !== p.price_min_cents ? ` – ${formatBRL(p.price_max_cents)}` : ""}`
                  : "a negociar",
                sub: p.unit ? `por ${p.unit}` : undefined,
              },
              p.min_order
                ? { label: "Pedido mínimo (PMO)", value: `${p.min_order.toLocaleString("pt-BR")} ${p.unit ?? "unid"}` }
                : null,
              { label: "Localização", value: `${p.supplier_city}, ${p.supplier_state}` },
              p.category_name
                ? { label: "Categoria", value: p.category_name }
                : null,
            ]
              .filter((x): x is { label: string; value: string; sub?: string } => x !== null)
              .map(({ label, value, sub }) => (
                <div key={label} className="rounded-xl border border-border p-3 space-y-0.5">
                  <p className="text-[11px] text-slate-400 font-medium">{label}</p>
                  <p className="text-sm font-bold text-slate-900">{value}</p>
                  {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
                </div>
              ))}
          </div>

          {p.tags && p.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {p.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTAs */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] text-white text-sm font-semibold h-11 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Solicitar cotação
            </button>
            <button
              onClick={handleDirectContact}
              disabled={directContactLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[color:var(--brand-green-300)] bg-white hover:bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)] text-sm font-semibold h-10 transition-colors disabled:opacity-50"
            >
              {directContactLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4" />
              )}
              Contato direto (Chat)
            </button>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setShowForm(true)}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-medium py-3 transition-colors"
              >
                <DollarSign className="w-4 h-4 text-slate-500" />
                Proposta
              </button>
              <button
                onClick={() => onCompare(p)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border text-xs font-medium py-3 transition-colors ${
                  inCompare
                    ? "border-[color:var(--brand-green-400)] bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)]"
                    : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700"
                }`}
              >
                <Scale className="w-4 h-4 text-slate-500" />
                {inCompare ? "Na pesquisa" : "Comparar"}
              </button>
              <Link
                href={`/fornecedor/${p.supplier_slug}`}
                onClick={onClose}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-medium py-3 transition-colors"
              >
                <Store className="w-4 h-4 text-slate-500" />
                <span className="text-center leading-tight">Ver empresa</span>
              </Link>
            </div>
          </div>

          {/* Formulário de proposta */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-xl border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] p-4"
            >
              <div>
                <p className="text-sm font-bold text-[color:var(--brand-green-900)]">Proposta direta</p>
                <p className="mt-1 text-xs text-[color:var(--brand-green-700)]">
                  Estruture os parâmetros da compra antes de abrir a conversa com o fornecedor.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                  Quantidade
                  <input
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
                    placeholder={String(p.min_order ?? 1)}
                    required
                  />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                  Preço alvo {p.unit ? `por ${p.unit}` : ""}
                  <input
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
                    placeholder="Ex: 10.00"
                  />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                  Prazo desejado
                  <input
                    value={desiredDeadline}
                    onChange={(e) => setDesiredDeadline(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
                    placeholder="Ex: 7 dias úteis"
                  />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                  Tipo de material
                  <input
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
                    placeholder={p.category_name ?? "Especificação"}
                  />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                  Origem
                  <select
                    value={originPreference}
                    onChange={(e) => setOriginPreference(e.target.value as OriginPreference)}
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
                  >
                    <option value="national">Mercado nacional</option>
                    <option value="imported">Importação</option>
                    <option value="any">Tanto faz</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                  Quem paga frete
                  <select
                    value={freightPayer}
                    onChange={(e) => setFreightPayer(e.target.value as FreightPayer)}
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
                  >
                    <option value="negotiable">Negociável</option>
                    <option value="buyer">Comprador paga</option>
                    <option value="supplier">Fornecedor paga</option>
                    <option value="split">Dividir frete</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-700 sm:col-span-2">
                  Tipo de frete
                  <select
                    value={freightType}
                    onChange={(e) => setFreightType(e.target.value as FreightType)}
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
                  >
                    <option value="carrier">Transportadora</option>
                    <option value="own_freight">Frete próprio</option>
                    <option value="pickup">Retirada</option>
                    <option value="negotiable">Negociável</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
                Observações
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-20 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)]"
                  placeholder="Ex: confirmar estoque disponível, condição de pagamento e frete para SP."
                />
              </label>

              {submitError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {submitError}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="h-10 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submitState === "submitting"}
                  className="h-10 flex-1 rounded-lg bg-[color:var(--brand-green-600)] text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)] disabled:opacity-50"
                >
                  {submitState === "submitting" ? "Enviando..." : "Enviar proposta"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Compare bar ──────────────────────────────────────────────────────────────

function CompareBar({
  items, onRemove, onClear, onGo,
}: {
  items: SearchProduct[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onGo: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-[color:var(--brand-green-800)] text-white rounded-2xl px-4 py-3 shadow-2xl border border-[color:var(--brand-green-700)]">
      <Scale className="w-4 h-4 text-[color:var(--brand-green-300)] shrink-0" />
      <div className="flex items-center gap-2">
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-1.5 bg-[color:var(--brand-green-700)] rounded-lg px-2.5 py-1">
            <span className="text-xs font-medium max-w-[100px] truncate">{p.name}</span>
            <button onClick={() => onRemove(p.id)} className="text-slate-400 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {items.length < 3 && (
          <span className="text-xs text-[color:var(--brand-green-300)]">
            {3 - items.length} vaga{3 - items.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[color:var(--brand-green-600)]">
        <button
          onClick={onGo}
          disabled={items.length < 2}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Comparar
        </button>
        <button onClick={onClear} className="text-slate-400 hover:text-white" aria-label="Limpar">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page, total, pageSize, onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col items-center gap-3 pt-4">
      <p className="text-xs text-slate-500">
        Exibindo <span className="font-semibold text-slate-700">{from}–{to}</span> de{" "}
        <span className="font-semibold text-slate-700">{total}</span> resultados
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="w-8 text-center text-sm text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`w-8 h-8 rounded-lg text-sm font-medium border transition-colors ${
                p === page
                  ? "bg-[color:var(--brand-green-600)] text-white border-[color:var(--brand-green-600)]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === Math.ceil(total / pageSize)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface ExplorerSearchProps {
  canUseWebSearch?: boolean;
}

export default function ExplorerSearch({ canUseWebSearch = false }: ExplorerSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCategoria = searchParams.get("categoria");
  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    query: searchParams.get("empresa") ?? searchParams.get("q") ?? "",
    category: initialCategoria ?? "",
  });
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<SearchProduct | null>(null);
  const [pendingFormState, setPendingFormState] = useState<ProposalFormState | null>(null);
  const [compareList, setCompareList] = useState<SearchProduct[]>([]);
  const [webSearch, setWebSearch] = useState(false);
  const [needsOpen, setNeedsOpen] = useState(false);
  const [needsInitial, setNeedsInitial] = useState<{ query: string; description: string | null } | null>(null);

  // Restore pending proposal after auth redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(PENDING_PROPOSAL_KEY);
    if (!raw) return;
    try {
      const pending: PendingProposal = JSON.parse(raw);
      if (Date.now() - pending.timestamp < 3_600_000) {
        setSelected(pending.product);
        setPendingFormState(pending.formState);
      }
    } catch { /* ignore malformed data */ }
    localStorage.removeItem(PENDING_PROPOSAL_KEY);
  }, []);

  // Restore pending need after auth redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("girob2b_pending_need");
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as {
        query: string;
        description: string | null;
        timestamp: number;
      };
      if (Date.now() - pending.timestamp < 3_600_000 && typeof pending.query === "string") {
        setNeedsInitial({ query: pending.query, description: pending.description ?? null });
        setNeedsOpen(true);
      }
    } catch { /* ignore malformed data */ }
    localStorage.removeItem("girob2b_pending_need");
  }, []);

  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(filters.query);

  useEffect(() => {
    if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    queryDebounceRef.current = setTimeout(() => {
      setDebouncedQuery(filters.query);
      setPage(1);
    }, DEBOUNCE_MS);
    return () => { if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current); };
  }, [filters.query]);

  const currentSearchKey = useMemo(
    () => JSON.stringify([debouncedQuery, filters.category, filters.state, filters.moqIndex, filters.sortBy, filters.supplierTypes, page]),
    [debouncedQuery, filters.category, filters.state, filters.moqIndex, filters.sortBy, filters.supplierTypes, page]
  );

  const [fetchResult, setFetchResult] = useState<{
    results: SearchProduct[];
    total: number;
    error: string | null;
    key: string;
  } | null>(null);

  const loading = fetchResult === null || fetchResult.key !== currentSearchKey;
  const results = loading ? [] : (fetchResult?.results ?? []);
  const total = loading ? 0 : (fetchResult?.total ?? 0);
  const error = loading ? null : (fetchResult?.error ?? null);

  useEffect(() => {
    let cancelled = false;
    const key = currentSearchKey;
    const [q, category, state, moqIdx, sortBy, supplierTypes, pg] = JSON.parse(key) as
      [string, string, string, number, string, string[], number];

    const params = new URLSearchParams();
    if (q.length >= 2) params.set("q", q);
    if (category) params.set("category", category);
    if (state) params.set("state", state);
    if (moqIdx > 0) {
      const moq = MOQ_OPTIONS[moqIdx];
      if (moq.max !== null) params.set("max_moq", String(moq.max));
      if (moq.min > 0) params.set("min_moq", String(moq.min));
    }
    if (supplierTypes.length > 0) params.set("supplier_types", supplierTypes.join(","));
    params.set("sort", sortBy);
    params.set("page", String(pg));

    fetch(`/api/search?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Erro ${r.status}`);
        return r.json() as Promise<SearchResponse>;
      })
      .then((data) => {
        if (!cancelled) {
          setFetchResult({ results: data.products, total: data.total, error: null, key });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFetchResult({ results: [], total: 0, error: err instanceof Error ? err.message : "Erro ao buscar produtos.", key });
        }
      });

    return () => { cancelled = true; };
  }, [currentSearchKey]);

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    if (!("query" in patch)) setPage(1);
  }, []);

  function toggleSupplierType(slug: string) {
    setFilters((f) => ({
      ...f,
      supplierTypes: f.supplierTypes.includes(slug)
        ? f.supplierTypes.filter((s) => s !== slug)
        : [...f.supplierTypes, slug],
    }));
    setPage(1);
  }

  function handleCompare(p: SearchProduct) {
    setCompareList((prev) =>
      prev.find((x) => x.id === p.id)
        ? prev.filter((x) => x.id !== p.id)
        : prev.length >= 3 ? prev : [...prev, p]
    );
  }

  const handleModalClose = useCallback(() => {
    setSelected(null);
    setPendingFormState(null);
  }, []);

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.state ? 1 : 0) +
    (filters.moqIndex > 0 ? 1 : 0) +
    filters.supplierTypes.length;

  const SORT_LABELS = { recent: "Mais recentes", price: "Menor preço", moq: "Menor pedido mín." };
  const isIdleState = !debouncedQuery.trim() && !filters.category && !filters.state && filters.moqIndex === 0 && filters.supplierTypes.length === 0;

  return (
    <>
      {/* ── Barra de busca ────────────────────────────────────────────────── */}
      <div className="space-y-2 mb-5">
        {/* Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => updateFilters({ query: e.target.value })}
            placeholder="Buscar produtos ou fornecedores"
            aria-label="Buscar produtos, fornecedores, segmentos ou cidades"
            className="w-full h-12 rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[color:var(--brand-green-500)] focus:ring-4 focus:ring-[color:var(--brand-green-100)] transition-all shadow-sm"
          />
          {filters.query && (
            <button
              onClick={() => updateFilters({ query: "" })}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sugestões rápidas quando vazio */}
        {!filters.query && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium">Populares:</span>
            {POPULAR_SEARCHES.map((s) => (
              <button
                key={s}
                onClick={() => updateFilters({ query: s })}
                className="text-[11px] px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-[color:var(--brand-green-300)] hover:text-[color:var(--brand-green-700)] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Modos de pesquisa + tipo de fornecedor */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Modos */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Interna — sempre ativa */}
            <span
              title="Busca nos fornecedores cadastrados na plataforma GiroB2B"
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[color:var(--brand-green-600)] text-white select-none cursor-default"
            >
              <CheckCircle2 className="w-3 h-3" /> Interna
            </span>
            {/* Web search (gated) OU botão de necessidades */}
            {canUseWebSearch ? (
              <button
                onClick={() => setWebSearch((w) => !w)}
                title="Pesquisa fornecedores em toda a internet, além do catálogo interno"
                className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                  webSearch
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-slate-200 text-slate-500 bg-white hover:border-slate-300"
                }`}
              >
                <Globe className="w-3 h-3" /> Pesquisa na web
              </button>
            ) : (
              <button
                onClick={() => setNeedsOpen(true)}
                title="Não encontrou o que precisa? Peça para nossos admins cadastrarem — leva 1 a 2 dias úteis"
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)] hover:border-[color:var(--brand-green-400)]"
              >
                <ClipboardList className="w-3 h-3" /> Adicionar à lista de necessidades
              </button>
            )}
            {/* Profunda — desabilitada */}
            <span
              title="Em breve — busca simultânea no catálogo interno e na web, com comparação automática"
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-slate-100 text-slate-300 bg-white cursor-not-allowed select-none"
            >
              <Zap className="w-3 h-3" /> Profunda
            </span>
          </div>

          {/* Tipo de fornecedor */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium">Tipo:</span>
            {SUPPLIER_TYPES.map((t) => {
              const active = filters.supplierTypes.includes(t.slug);
              return (
                <button
                  key={t.slug}
                  onClick={() => toggleSupplierType(t.slug)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                    active
                      ? "bg-[color:var(--brand-green-50)] border-[color:var(--brand-green-400)] text-[color:var(--brand-green-700)]"
                      : "border-slate-200 text-slate-600 bg-white hover:border-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Banner web search — instrução quando query vazia */}
        {webSearch && debouncedQuery.trim().length < 2 && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs">
            <Globe className="w-4 h-4 shrink-0" />
            <span>
              <strong>Pesquisa na web ativada.</strong> Digite pelo menos 2 caracteres para buscarmos empresas na internet.
            </span>
            <button onClick={() => setWebSearch(false)} className="ml-auto shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Painel de resultados web (quando ativo + query válida) ────────── */}
      {webSearch && debouncedQuery.trim().length >= 2 && (
        <WebSearchPanel
          query={debouncedQuery}
          filters={{
            state: filters.state || undefined,
            segment_slug: filters.category || undefined,
          }}
          onClose={() => setWebSearch(false)}
        />
      )}

      {/* ── Barra de filtros ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {/* Segmento */}
        <FilterDropdown
          label="Segmento"
          selectedLabel={CATEGORIAS.find((c) => c.slug === filters.category)?.nome}
          onClear={() => updateFilters({ category: "" })}
        >
          {CATEGORIAS.map((c) => (
            <DropdownItem
              key={c.slug}
              label={c.nome}
              active={filters.category === c.slug}
              onClick={() => { updateFilters({ category: filters.category === c.slug ? "" : c.slug }); }}
            />
          ))}
        </FilterDropdown>

        {/* Estado */}
        <FilterDropdown
          label="Estado"
          selectedLabel={filters.state || undefined}
          onClear={() => updateFilters({ state: "" })}
        >
          {ESTADOS_BR.map((uf) => (
            <DropdownItem
              key={uf}
              label={uf}
              active={filters.state === uf}
              onClick={() => updateFilters({ state: filters.state === uf ? "" : uf })}
            />
          ))}
        </FilterDropdown>

        {/* Pedido mínimo */}
        <FilterDropdown
          label="Pedido mínimo"
          selectedLabel={filters.moqIndex > 0 ? MOQ_OPTIONS[filters.moqIndex].label : undefined}
          onClear={() => updateFilters({ moqIndex: 0 })}
        >
          {MOQ_OPTIONS.map((opt, i) => (
            <DropdownItem
              key={i}
              label={opt.label}
              active={filters.moqIndex === i}
              onClick={() => updateFilters({ moqIndex: i })}
            />
          ))}
        </FilterDropdown>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Contagem — escondida no estado inicial sem busca */}
        {!isIdleState && (
          <p className="text-sm text-slate-600 whitespace-nowrap">
            {loading ? (
              <span className="flex items-center gap-1.5 text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando...
              </span>
            ) : (
              <>
                <span className="font-semibold text-slate-900">{total}</span>{" "}
                resultado{total !== 1 ? "s" : ""}
              </>
            )}
          </p>
        )}

        {/* Ordenação + view toggle — escondidos no estado inicial */}
        {!isIdleState && (
          <>
            <FilterDropdown
              label={SORT_LABELS[filters.sortBy]}
              selectedLabel={undefined}
            >
              {(["recent", "price", "moq"] as const).map((s) => (
                <DropdownItem
                  key={s}
                  label={SORT_LABELS[s]}
                  active={filters.sortBy === s}
                  onClick={() => updateFilters({ sortBy: s })}
                />
              ))}
            </FilterDropdown>

            <div className="flex border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => { setView("list"); setPage(1); }}
                className={`p-2 transition-colors ${view === "list" ? "bg-[color:var(--brand-green-600)] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                title="Modo lista"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setView("grid"); setPage(1); }}
                className={`p-2 transition-colors ${view === "grid" ? "bg-[color:var(--brand-green-600)] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                title="Modo grade"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Chips de filtros ativos ───────────────────────────────────────── */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.category && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[color:var(--brand-green-50)] border border-[color:var(--brand-green-200)] text-[color:var(--brand-green-700)] font-medium">
              {CATEGORIAS.find((c) => c.slug === filters.category)?.nome ?? filters.category}
              <button onClick={() => updateFilters({ category: "" })}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.state && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium">
              {filters.state}
              <button onClick={() => updateFilters({ state: "" })}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.moqIndex > 0 && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-medium">
              {MOQ_OPTIONS[filters.moqIndex].label}
              <button onClick={() => updateFilters({ moqIndex: 0 })}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.supplierTypes.map((slug) => (
            <span key={slug} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium capitalize">
              {slug}
              <button onClick={() => toggleSupplierType(slug)}><X className="w-3 h-3" /></button>
            </span>
          ))}
          <button
            onClick={() => { updateFilters(DEFAULT_FILTERS); setPage(1); }}
            className="text-xs text-[color:var(--brand-green-600)] hover:underline"
          >
            Limpar tudo
          </button>
        </div>
      )}

      {/* ── Estado de erro ────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm mb-4">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setPage((p) => p)}
            className="ml-auto text-xs font-semibold underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── Skeleton ─────────────────────────────────────────────────────── */}
      {loading && !error && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-white p-4 flex gap-4 animate-pulse">
              <div className="w-20 h-20 rounded-lg bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
              <div className="w-32 space-y-2">
                <div className="h-3 bg-slate-100 rounded" />
                <div className="h-8 bg-slate-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Conteúdo ─────────────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {results.length === 0 ? (
            !filters.query.trim() && !filters.category && !filters.state ? (
              <RecentNeedsSuggestions
                onPick={({ query, state, category }) =>
                  updateFilters({
                    query,
                    state: state ?? "",
                    category: category ?? "",
                  })
                }
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                  <Search className="h-7 w-7 text-slate-300" />
                </div>
                <div className="max-w-md space-y-1">
                  <p className="font-bold text-slate-900">Nenhum fornecedor encontrado</p>
                  <p className="text-sm text-slate-500">
                    {filters.query.trim()
                      ? <>Não achamos fornecedores para <strong className="text-slate-700">&ldquo;{filters.query}&rdquo;</strong>. Peça para nossos admins cadastrarem — leva 1 a 2 dias úteis.</>
                      : "Tente ajustar os filtros ou usar termos diferentes."}
                  </p>
                </div>
                {filters.query.trim().length >= 2 && (
                  <button
                    type="button"
                    onClick={() => setNeedsOpen(true)}
                    className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Adicionar à lista de necessidades
                  </button>
                )}
              </div>
            )
          ) : view === "list" ? (
            <div className="space-y-3">
              {results.map((p) => (
                <ProdutoCardList
                  key={p.id}
                  p={p}
                  onClick={() => setSelected(p)}
                  onCompare={() => handleCompare(p)}
                  inCompare={!!compareList.find((x) => x.id === p.id)}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {results.map((p) => (
                <ProdutoCardGrid
                  key={p.id}
                  p={p}
                  onClick={() => setSelected(p)}
                  onCompare={() => handleCompare(p)}
                  inCompare={!!compareList.find((x) => x.id === p.id)}
                />
              ))}
            </div>
          )}

          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </>
      )}

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {selected && (
        <ProdutoModal
          p={selected}
          onClose={handleModalClose}
          onCompare={handleCompare}
          inCompare={!!compareList.find((x) => x.id === selected.id)}
          initialFormState={pendingFormState}
        />
      )}

      {/* ── Barra comparação ─────────────────────────────────────────────── */}
      <CompareBar
        items={compareList}
        onRemove={(id) => setCompareList((prev) => prev.filter((x) => x.id !== id))}
        onClear={() => setCompareList([])}
        onGo={() => { router.push("/painel/comparador"); setSelected(null); }}
      />

      {/* ── Dialog de necessidade (gate da busca web) ─────────────────────── */}
      <NeedsDialog
        open={needsOpen}
        initialQuery={needsInitial?.query ?? filters.query}
        initialDescription={needsInitial?.description ?? null}
        filters={{
          state: filters.state || undefined,
          category: filters.category || undefined,
        }}
        onClose={() => {
          setNeedsOpen(false);
          setNeedsInitial(null);
        }}
      />
    </>
  );
}
