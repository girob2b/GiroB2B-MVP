"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, MapPin, Clock, Package, X, ChevronLeft, ChevronRight,
  Building2, Tag, MessageSquare, DollarSign, Scale, Store,
  Trash2, LayoutList, LayoutGrid, SlidersHorizontal, Filter,
  CheckCircle2, Plus, Loader2, Sparkles,
} from "lucide-react";
import { PRODUTOS_MOCK, CATEGORIAS, type ProdutoMock } from "../_data/produtos-mock";
import { createClient } from "@/lib/supabase/client";
import { apiClient } from "@/lib/api-client";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE_LIST = 20;
const PAGE_SIZE_GRID = 25;

const TIPO_LABELS: Record<string, string> = {
  fabrica: "Fábrica", atacado: "Atacado", varejo: "Varejo", importacao: "Importação",
};
const TIPO_COLORS: Record<string, string> = {
  fabrica:    "bg-blue-50 text-blue-700 border-blue-200",
  atacado:    "bg-amber-50 text-amber-700 border-amber-200",
  varejo:     "bg-purple-50 text-purple-700 border-purple-200",
  importacao: "bg-rose-50 text-rose-700 border-rose-200",
};
const CAT_BG: Record<string, string> = {
  embalagens:             "bg-sky-100",
  "alimentos-bebidas":    "bg-orange-100",
  "materiais-construcao": "bg-stone-100",
  "textil-confeccao":     "bg-pink-100",
  autopecas:              "bg-zinc-100",
  "industria-manufatura": "bg-slate-100",
  tecnologia:             "bg-indigo-100",
  agronegocio:            "bg-green-100",
  "limpeza-higiene":      "bg-teal-100",
};

const MOQ_OPTIONS = [
  { label: "Qualquer quantidade",  min: 0,    max: Infinity },
  { label: "Até 100 unidades",     min: 0,    max: 100 },
  { label: "Até 500 unidades",     min: 0,    max: 500 },
  { label: "Até 1.000 unidades",   min: 0,    max: 1000 },
  { label: "Acima de 1.000",       min: 1001, max: Infinity },
];

const PRAZO_OPTIONS = [
  { label: "Qualquer prazo",  max: Infinity },
  { label: "Até 3 dias",      max: 3 },
  { label: "Até 7 dias",      max: 7 },
  { label: "Até 15 dias",     max: 15 },
];

const TODOS_ESTADOS = [...new Set(PRODUTOS_MOCK.map(p => p.estado))].sort();
const TODOS_TIPOS   = ["fabrica", "atacado", "varejo", "importacao"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Filter state ─────────────────────────────────────────────────────────────

interface Filters {
  query:     string;
  categorias: string[];           // slugs
  tipos:     string[];
  estados:   string[];
  moqIndex:  number;              // índice em MOQ_OPTIONS
  prazoIndex: number;             // índice em PRAZO_OPTIONS
  sortBy:    "relevancia" | "preco" | "prazo" | "moq";
}

const DEFAULT_FILTERS: Filters = {
  query: "", categorias: [], tipos: [], estados: [],
  moqIndex: 0, prazoIndex: 0, sortBy: "relevancia",
};

// ─── Sidebar de filtros ───────────────────────────────────────────────────────

function FilterSidebar({
  filters, onChange, results,
}: {
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
  results: ProdutoMock[];
}) {
  function toggleArr<T>(arr: T[], val: T) {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  }

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    PRODUTOS_MOCK.forEach(p => { m[p.categoriaSlug] = (m[p.categoriaSlug] ?? 0) + 1; });
    return m;
  }, []);

  const estadoCounts = useMemo(() => {
    const m: Record<string, number> = {};
    PRODUTOS_MOCK.forEach(p => { m[p.estado] = (m[p.estado] ?? 0) + 1; });
    return m;
  }, []);

  const hasAny = filters.categorias.length > 0 || filters.tipos.length > 0 ||
    filters.estados.length > 0 || filters.moqIndex > 0 || filters.prazoIndex > 0;

  return (
    <aside className="space-y-5">
      {/* Header filtros */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-slate-500" /> Filtros
        </span>
        {hasAny && (
          <button
            onClick={() => onChange({ categorias: [], tipos: [], estados: [], moqIndex: 0, prazoIndex: 0 })}
            className="text-xs text-[color:var(--brand-green-600)] hover:underline"
          >
            Limpar tudo
          </button>
        )}
      </div>

      {/* Segmento */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Segmento</p>
        <div className="space-y-1.5">
          {CATEGORIAS.map(c => {
            const active = filters.categorias.includes(c.slug);
            return (
              <label key={c.slug} className="flex items-center justify-between gap-2 cursor-pointer group">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${active ? "bg-[color:var(--brand-green-600)] border-[color:var(--brand-green-600)]" : "border-slate-300 group-hover:border-[color:var(--brand-green-400)]"}`}>
                    {active && <X className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={active}
                    onChange={() => onChange({ categorias: toggleArr(filters.categorias, c.slug), })}
                  />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900">{c.nome}</span>
                </div>
                <span className="text-xs text-slate-400 tabular-nums">{catCounts[c.slug] ?? 0}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Tipo de fornecedor */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo de fornecedor</p>
        <div className="space-y-1.5">
          {TODOS_TIPOS.map(tipo => {
            const active = filters.tipos.includes(tipo);
            return (
              <label key={tipo} className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${active ? "bg-[color:var(--brand-green-600)] border-[color:var(--brand-green-600)]" : "border-slate-300 group-hover:border-[color:var(--brand-green-400)]"}`}>
                  {active && <X className="w-2.5 h-2.5 text-white" />}
                </div>
                <input type="checkbox" className="sr-only" checked={active} onChange={() => onChange({ tipos: toggleArr(filters.tipos, tipo) })} />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">{TIPO_LABELS[tipo]}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Estado */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</p>
        <div className="grid grid-cols-2 gap-1.5">
          {TODOS_ESTADOS.map(uf => {
            const active = filters.estados.includes(uf);
            return (
              <label key={uf} className="flex items-center gap-1.5 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${active ? "bg-[color:var(--brand-green-600)] border-[color:var(--brand-green-600)]" : "border-slate-300 group-hover:border-[color:var(--brand-green-400)]"}`}>
                  {active && <X className="w-2.5 h-2.5 text-white" />}
                </div>
                <input type="checkbox" className="sr-only" checked={active} onChange={() => onChange({ estados: toggleArr(filters.estados, uf) })} />
                <span className="text-xs text-slate-700">{uf}</span>
                <span className="text-[10px] text-slate-400 ml-auto">{estadoCounts[uf] ?? 0}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Pedido mínimo */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pedido mínimo</p>
        <div className="space-y-1.5">
          {MOQ_OPTIONS.map((opt, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${filters.moqIndex === i ? "border-[color:var(--brand-green-600)]" : "border-slate-300 group-hover:border-[color:var(--brand-green-400)]"}`}>
                {filters.moqIndex === i && <div className="w-2 h-2 rounded-full bg-[color:var(--brand-green-600)]" />}
              </div>
              <input type="radio" className="sr-only" checked={filters.moqIndex === i} onChange={() => onChange({ moqIndex: i })} />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Prazo de entrega */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prazo de entrega</p>
        <div className="space-y-1.5">
          {PRAZO_OPTIONS.map((opt, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${filters.prazoIndex === i ? "border-[color:var(--brand-green-600)]" : "border-slate-300 group-hover:border-[color:var(--brand-green-400)]"}`}>
                {filters.prazoIndex === i && <div className="w-2 h-2 rounded-full bg-[color:var(--brand-green-600)]" />}
              </div>
              <input type="radio" className="sr-only" checked={filters.prazoIndex === i} onChange={() => onChange({ prazoIndex: i })} />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ─── Card — modo lista (padrão B2B) ──────────────────────────────────────────

function ProdutoCardList({ p, onClick, onCompare, inCompare }: {
  p: ProdutoMock; onClick: () => void; onCompare: () => void; inCompare: boolean;
}) {
  const bg = CAT_BG[p.categoriaSlug] ?? "bg-slate-100";
  return (
    <div className={`flex gap-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all p-4 ${inCompare ? "border-[color:var(--brand-green-400)] ring-2 ring-[color:var(--brand-green-100)]" : "border-border hover:border-[color:var(--brand-green-200)]"}`}>
      {/* Foto */}
      <button onClick={onClick} className={`w-20 h-20 shrink-0 rounded-lg ${bg} flex flex-col items-center justify-center gap-1 text-slate-400 hover:opacity-80 transition-opacity`}>
        <Package className="w-7 h-7" />
        <span className="text-[9px] font-medium text-center px-1 leading-tight">{p.categoria}</span>
      </button>

      {/* Info principal */}
      <button onClick={onClick} className="flex-1 min-w-0 text-left space-y-1 hover:text-inherit">
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="font-semibold text-slate-900 text-sm leading-tight hover:text-[color:var(--brand-green-700)] transition-colors">
            {p.nome}
          </h3>
          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${TIPO_COLORS[p.tipo]}`}>
            {TIPO_LABELS[p.tipo]}
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium">{p.fornecedor}</p>
        <p className="text-xs text-slate-400 line-clamp-1">{p.descricao}</p>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap pt-0.5">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.cidade}, {p.estado}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Entrega em {p.prazoEntrega}d</span>
          <span className="flex items-center gap-1 font-medium text-slate-600">
            PMO: {p.pedidoMinimo.toLocaleString("pt-BR")} {p.unidade}
          </span>
        </div>
      </button>

      {/* Preço + ações */}
      <div className="shrink-0 flex flex-col items-end justify-between gap-3 min-w-[140px]">
        <div className="text-right">
          <p className="text-[10px] text-slate-400">Faixa / {p.unidade}</p>
          <p className="text-sm font-bold text-slate-900 tabular-nums leading-tight">
            {formatBRL(p.precoMin)}
          </p>
          {p.precoMin !== p.precoMax && (
            <p className="text-[11px] text-slate-500 tabular-nums">até {formatBRL(p.precoMax)}</p>
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

// ─── Card — modo grid ─────────────────────────────────────────────────────────

function ProdutoCardGrid({ p, onClick, onCompare, inCompare }: {
  p: ProdutoMock; onClick: () => void; onCompare: () => void; inCompare: boolean;
}) {
  const bg = CAT_BG[p.categoriaSlug] ?? "bg-slate-100";
  return (
    <div className={`rounded-xl border bg-white shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden ${inCompare ? "border-[color:var(--brand-green-400)] ring-2 ring-[color:var(--brand-green-100)]" : "border-border hover:border-[color:var(--brand-green-200)]"}`}>
      <button onClick={onClick} className={`w-full aspect-[4/3] ${bg} flex flex-col items-center justify-center gap-1 relative`}>
        <Package className="w-8 h-8 text-slate-400" />
        <span className="text-[10px] text-slate-400 font-medium">{p.categoria}</span>
        <span className={`absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${TIPO_COLORS[p.tipo]}`}>
          {TIPO_LABELS[p.tipo]}
        </span>
        {inCompare && (
          <span className="absolute top-2 left-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[color:var(--brand-green-600)] text-white">
            Comparando
          </span>
        )}
      </button>
      <button onClick={onClick} className="p-3 text-left flex-1 space-y-1 hover:text-inherit">
        <p className="text-xs font-semibold text-slate-900 line-clamp-2 hover:text-[color:var(--brand-green-700)] transition-colors">{p.nome}</p>
        <p className="text-[11px] text-slate-500 truncate">{p.fornecedor}</p>
        <div className="pt-1 space-y-0.5">
          <p className="text-[10px] text-slate-400">A partir de</p>
          <p className="text-sm font-bold text-slate-900 tabular-nums">{formatBRL(p.precoMin)}<span className="text-[10px] font-normal text-slate-400">/{p.unidade}</span></p>
          <p className="text-[10px] text-slate-500">PMO: {p.pedidoMinimo.toLocaleString("pt-BR")} {p.unidade}</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-0.5">
          <MapPin className="w-2.5 h-2.5 shrink-0" />{p.estado}
          <span className="mx-1">·</span>
          <Clock className="w-2.5 h-2.5 shrink-0" />{p.prazoEntrega}d
        </div>
      </button>
      <div className="px-3 pb-3 flex gap-1.5">
        <button onClick={onClick} className="flex-1 h-7 rounded-lg bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] text-white text-[11px] font-semibold transition-colors">
          Solicitar cotação
        </button>
        <button onClick={onCompare} className={`h-7 w-8 rounded-lg border flex items-center justify-center transition-colors ${inCompare ? "border-[color:var(--brand-green-400)] bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-600)]" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
          <Scale className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function ProdutoModal({ p, onClose, onCompare, inCompare }: {
  p: ProdutoMock; onClose: () => void; onCompare: (p: ProdutoMock) => void; inCompare: boolean;
}) {
  const router = useRouter();
  const bg = CAT_BG[p.categoriaSlug] ?? "bg-slate-100";

  function goChat(negociar = false) {
    const params = new URLSearchParams({ produto: p.nome, fornecedor: p.fornecedor });
    if (negociar) { params.set("negociar", "true"); params.set("preco", String(p.precoMin)); }
    router.push(`/painel/chat?${params}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className={`w-full h-40 ${bg} flex flex-col items-center justify-center gap-2`}>
          <Package className="w-12 h-12 text-slate-400" />
          <span className="text-sm text-slate-500 font-medium">{p.categoria}</span>
        </div>
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white shadow transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">{p.nome}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{p.fornecedor}</p>
            </div>
            <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full border ${TIPO_COLORS[p.tipo]}`}>{TIPO_LABELS[p.tipo]}</span>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">{p.descricao}</p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Faixa de preço", value: `${formatBRL(p.precoMin)} – ${formatBRL(p.precoMax)}`, sub: `por ${p.unidade}` },
              { label: "Pedido mínimo (PMO)", value: `${p.pedidoMinimo.toLocaleString("pt-BR")} ${p.unidade}` },
              { label: "Prazo de entrega", value: `${p.prazoEntrega} dias úteis` },
              { label: "Localização", value: `${p.cidade}, ${p.estado}` },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-xl border border-border p-3 space-y-0.5">
                <p className="text-[11px] text-slate-400 font-medium">{label}</p>
                <p className="text-sm font-bold text-slate-900">{value}</p>
                {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2">
            <Tag className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {p.tags.map(tag => (
                <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600">{tag}</span>
              ))}
            </div>
          </div>

          {/* CTAs B2B */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => goChat()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] text-white text-sm font-semibold h-11 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Solicitar cotação
            </button>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => goChat(true)} className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-medium py-3 transition-colors">
                <DollarSign className="w-4 h-4 text-slate-500" />
                Negociar
              </button>
              <button onClick={() => onCompare(p)} className={`flex flex-col items-center justify-center gap-1 rounded-xl border text-xs font-medium py-3 transition-colors ${inCompare ? "border-[color:var(--brand-green-400)] bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)]" : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700"}`}>
                <Scale className="w-4 h-4 text-slate-500" />
                {inCompare ? "Adicionado" : "Comparar"}
              </button>
              <button
                onClick={() => { router.push(`/painel/explorar?empresa=${encodeURIComponent(p.fornecedor)}`); onClose(); }}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-medium py-3 transition-colors"
              >
                <Store className="w-4 h-4 text-slate-500" />
                <span className="text-center leading-tight">Ver empresa</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Barra de comparação ──────────────────────────────────────────────────────

function CompareBar({ items, onRemove, onClear, onGo }: {
  items: ProdutoMock[]; onRemove: (id: string) => void; onClear: () => void; onGo: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-2xl border border-slate-700">
      <Scale className="w-4 h-4 text-[color:var(--brand-green-400)] shrink-0" />
      <div className="flex items-center gap-2">
        {items.map(p => (
          <div key={p.id} className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-xs font-medium max-w-[100px] truncate">{p.nome}</span>
            <button onClick={() => onRemove(p.id)} className="text-slate-400 hover:text-white"><X className="w-3 h-3" /></button>
          </div>
        ))}
        {items.length < 3 && <span className="text-xs text-slate-400">{3 - items.length} vaga{3 - items.length !== 1 ? "s" : ""}</span>}
      </div>
      <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-700">
        <button onClick={onGo} disabled={items.length < 2} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          Comparar
        </button>
        <button onClick={onClear} className="text-slate-400 hover:text-white" aria-label="Limpar"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

// ─── Paginação ────────────────────────────────────────────────────────────────

function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

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
        <button onClick={() => onChange(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="w-8 text-center text-sm text-slate-400">…</span>
          ) : (
            <button key={p} onClick={() => onChange(p as number)} className={`w-8 h-8 rounded-lg text-sm font-medium border transition-colors ${p === page ? "bg-[color:var(--brand-green-600)] text-white border-[color:var(--brand-green-600)]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onChange(page + 1)} disabled={page === Math.ceil(total / pageSize)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function IntegrationSuggestionCard({ query, categorySlug }: { query: string, categorySlug?: string }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Sessão expirada. Faça login novamente.");
        return;
      }

      const client = apiClient(session.access_token);
      await client.post("/suggestions", { query, category_slug: categorySlug });
      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao enviar sugestão.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[color:var(--brand-green-50)] border border-[color:var(--brand-green-200)] rounded-3xl shadow-sm text-center space-y-4 animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
          <CheckCircle2 className="w-8 h-8 text-[color:var(--brand-green-600)]" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-[color:var(--brand-green-900)]">Sugestão enviada!</p>
          <p className="text-sm text-[color:var(--brand-green-700)]">
            Obrigado! Nossa equipe de integração já foi notificada para buscar fornecedores de <strong>"{query}"</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-8 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl shadow-xl text-left space-y-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
        <Sparkles className="w-24 h-24 text-white" />
      </div>
      
      <div className="space-y-3 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:var(--brand-green-500)]/20 border border-[color:var(--brand-green-500)]/30 text-[color:var(--brand-green-400)] text-[10px] font-bold uppercase tracking-wider">
          <Plus className="w-3 h-3" /> Lista de Integração
        </div>
        <h3 className="text-xl font-bold text-white">Quer colocar na lista de integração?</h3>
        <p className="text-slate-300 text-sm leading-relaxed">
          Não encontrou o que procurava? Ao sugerir <strong>"{query}"</strong>, estimulamos nossos mecanismos de busca para cadastrar fornecedores especializados exatamente no que você precisa.
        </p>
      </div>

      <button
        onClick={handleSuggest}
        disabled={loading}
        className="relative z-10 w-full h-12 rounded-2xl bg-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-700)] text-white font-bold text-sm transition-all shadow-[0_8px_20px_rgba(18,199,104,0.3)] hover:shadow-[0_12px_24px_rgba(18,199,104,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sugerir este material"}
      </button>

      {error && (
        <div className="relative z-10 text-xs font-semibold text-red-200 bg-red-500/15 border border-red-500/30 rounded-2xl px-4 py-3">
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ExplorerSearch() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters]         = useState<Filters>({
    ...DEFAULT_FILTERS,
    query: searchParams.get("empresa") ?? "",
  });
  const [page,        setPage]        = useState(1);
  const [view,        setView]        = useState<"list" | "grid">("list");
  const [selected,    setSelected]    = useState<ProdutoMock | null>(null);
  const [compareList, setCompareList] = useState<ProdutoMock[]>([]);
  const [mobileFilters, setMobileFilters] = useState(false);

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    setFilters(f => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  useEffect(() => {
    const empresa = searchParams.get("empresa");
    if (empresa) updateFilters({ query: empresa });
  }, [searchParams, updateFilters]);

  const results = useMemo(() => {
    let list = PRODUTOS_MOCK;

    if (filters.categorias.length > 0) list = list.filter(p => filters.categorias.includes(p.categoriaSlug));
    if (filters.tipos.length > 0)      list = list.filter(p => filters.tipos.includes(p.tipo));
    if (filters.estados.length > 0)    list = list.filter(p => filters.estados.includes(p.estado));

    const moq = MOQ_OPTIONS[filters.moqIndex];
    if (moq.max !== Infinity || moq.min > 0) {
      list = list.filter(p => p.pedidoMinimo >= moq.min && p.pedidoMinimo <= moq.max);
    }

    const prazo = PRAZO_OPTIONS[filters.prazoIndex];
    if (prazo.max !== Infinity) list = list.filter(p => p.prazoEntrega <= prazo.max);

    if (filters.query.trim().length >= 2) {
      const q = filters.query.toLowerCase();
      list = list.filter(p =>
        p.nome.toLowerCase().includes(q) ||
        p.fornecedor.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        p.cidade.toLowerCase().includes(q) ||
        p.estado.toLowerCase().includes(q)
      );
    }

    if (filters.sortBy === "preco") list = [...list].sort((a, b) => a.precoMin - b.precoMin);
    if (filters.sortBy === "prazo") list = [...list].sort((a, b) => a.prazoEntrega - b.prazoEntrega);
    if (filters.sortBy === "moq")   list = [...list].sort((a, b) => a.pedidoMinimo - b.pedidoMinimo);

    return list;
  }, [filters]);

  const pageSize  = view === "list" ? PAGE_SIZE_LIST : PAGE_SIZE_GRID;
  const paginated = results.slice((page - 1) * pageSize, page * pageSize);

  const activeFilterCount =
    filters.categorias.length + filters.tipos.length + filters.estados.length +
    (filters.moqIndex > 0 ? 1 : 0) + (filters.prazoIndex > 0 ? 1 : 0);

  function handleCompare(p: ProdutoMock) {
    setCompareList(prev =>
      prev.find(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) :
      prev.length >= 3 ? prev : [...prev, p]
    );
  }

  return (
    <>
      {/* Barra de busca */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={filters.query}
          onChange={e => updateFilters({ query: e.target.value })}
          placeholder="Buscar produtos, fornecedores, segmentos, cidades..."
          className="w-full h-12 rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[color:var(--brand-green-500)] focus:ring-4 focus:ring-[color:var(--brand-green-100)] transition-all shadow-sm"
        />
        {filters.query && (
          <button onClick={() => updateFilters({ query: "" })} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Layout sidebar + resultados */}
      <div className="flex gap-6">
        {/* Sidebar desktop */}
        <div className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-4 bg-white border border-border rounded-2xl p-4 shadow-sm">
            <FilterSidebar filters={filters} onChange={updateFilters} results={results} />
          </div>
        </div>

        {/* Resultados */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Mobile: botão filtros */}
            <button
              onClick={() => setMobileFilters(true)}
              className="lg:hidden flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[color:var(--brand-green-600)] text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Contador */}
            <p className="text-sm text-slate-600 flex-1">
              <span className="font-semibold text-slate-900">{results.length}</span>{" "}
              fornecedor{results.length !== 1 ? "es" : ""} encontrado{results.length !== 1 ? "s" : ""}
            </p>

            {/* Ordenar */}
            <select
              value={filters.sortBy}
              onChange={e => updateFilters({ sortBy: e.target.value as Filters["sortBy"] })}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-green-500)] transition"
            >
              <option value="relevancia">Relevância</option>
              <option value="preco">Menor preço</option>
              <option value="prazo">Menor prazo</option>
              <option value="moq">Menor pedido mínimo</option>
            </select>

            {/* View toggle */}
            <div className="flex border border-slate-200 rounded-xl overflow-hidden">
              <button onClick={() => { setView("list"); setPage(1); }} className={`p-2 transition-colors ${view === "list" ? "bg-[color:var(--brand-green-600)] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`} title="Modo lista">
                <LayoutList className="w-4 h-4" />
              </button>
              <button onClick={() => { setView("grid"); setPage(1); }} className={`p-2 transition-colors ${view === "grid" ? "bg-[color:var(--brand-green-600)] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`} title="Modo grade">
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chips de filtros ativos */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.categorias.map(slug => {
                const cat = CATEGORIAS.find(c => c.slug === slug);
                return (
                  <span key={slug} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[color:var(--brand-green-50)] border border-[color:var(--brand-green-200)] text-[color:var(--brand-green-700)] font-medium">
                    {cat?.nome}
                    <button onClick={() => updateFilters({ categorias: filters.categorias.filter(c => c !== slug) })}><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
              {filters.tipos.map(tipo => (
                <span key={tipo} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-medium">
                  {TIPO_LABELS[tipo]}
                  <button onClick={() => updateFilters({ tipos: filters.tipos.filter(t => t !== tipo) })}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {filters.estados.map(uf => (
                <span key={uf} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                  {uf}
                  <button onClick={() => updateFilters({ estados: filters.estados.filter(e => e !== uf) })}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {filters.moqIndex > 0 && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-medium">
                  {MOQ_OPTIONS[filters.moqIndex].label}
                  <button onClick={() => updateFilters({ moqIndex: 0 })}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.prazoIndex > 0 && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-medium">
                  {PRAZO_OPTIONS[filters.prazoIndex].label}
                  <button onClick={() => updateFilters({ prazoIndex: 0 })}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {/* Grid / Lista */}
          {results.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-12">
              <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">Nenhum fornecedor encontrado</p>
                  <p className="text-sm text-slate-500">
                    Tente ajustar os filtros ou usar termos diferentes.
                  </p>
                </div>
              </div>

              {filters.query.trim().length >= 2 && (
                <IntegrationSuggestionCard query={filters.query} categorySlug={filters.categorias[0]} />
              )}
            </div>
          ) : view === "list" ? (
            <div className="space-y-3">
              {paginated.map(p => (
                <ProdutoCardList
                  key={p.id} p={p}
                  onClick={() => setSelected(p)}
                  onCompare={() => handleCompare(p)}
                  inCompare={!!compareList.find(x => x.id === p.id)}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {paginated.map(p => (
                <ProdutoCardGrid
                  key={p.id} p={p}
                  onClick={() => setSelected(p)}
                  onCompare={() => handleCompare(p)}
                  inCompare={!!compareList.find(x => x.id === p.id)}
                />
              ))}
            </div>
          )}

          <Pagination page={page} total={results.length} pageSize={pageSize} onChange={setPage} />
        </div>
      </div>

      {/* Mobile: drawer de filtros */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileFilters(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white overflow-y-auto p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-slate-900">Filtros</span>
              <button onClick={() => setMobileFilters(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <FilterSidebar filters={filters} onChange={updateFilters} results={results} />
            <button onClick={() => setMobileFilters(false)} className="mt-5 w-full h-11 rounded-xl bg-[color:var(--brand-green-600)] text-white font-semibold text-sm">
              Ver {results.length} resultados
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {selected && (
        <ProdutoModal
          p={selected}
          onClose={() => setSelected(null)}
          onCompare={handleCompare}
          inCompare={!!compareList.find(x => x.id === selected.id)}
        />
      )}

      {/* Barra comparação */}
      <CompareBar
        items={compareList}
        onRemove={id => setCompareList(prev => prev.filter(x => x.id !== id))}
        onClear={() => setCompareList([])}
        onGo={() => { router.push("/painel/comparador"); setSelected(null); }}
      />
    </>
  );
}
