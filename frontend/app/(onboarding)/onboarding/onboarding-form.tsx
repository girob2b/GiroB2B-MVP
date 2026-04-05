"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Building2, CheckCircle2, Hash, Loader2, Phone,
  ShoppingCart, Store, Users, ArrowLeft,
} from "lucide-react";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCNPJ, cleanCNPJ } from "@/lib/brasilapi";

// ─── Types ────────────────────────────────────────────────────────────────────
type Segment   = "buyer" | "supplier" | "both";
type Step      = 1 | 2 | 3 | 4;
type Direction = "forward" | "backward";

// ─── Static data ──────────────────────────────────────────────────────────────
const SEGMENTS: { value: Segment; title: string; description: string; icon: React.ElementType }[] = [
  { value: "buyer",    title: "Comprar",  description: "Preciso encontrar fornecedores e solicitar cotações para minha empresa.",        icon: ShoppingCart },
  { value: "supplier", title: "Vender",   description: "Quero receber pedidos de compradores e ampliar minha rede de clientes B2B.",     icon: Building2 },
  { value: "both",     title: "Ambos",    description: "Compro insumos e também vendo meus produtos ou serviços para outras empresas.", icon: Users },
];

const CATEGORIES = [
  { slug: "embalagens",             name: "Embalagens",               count: 142 },
  { slug: "alimentos-bebidas",      name: "Alimentos e Bebidas",      count: 89  },
  { slug: "materiais-construcao",   name: "Materiais de Construção",  count: 76  },
  { slug: "textil-confeccao",       name: "Têxtil e Confecção",       count: 61  },
  { slug: "autopecas",              name: "Autopeças",                count: 54  },
  { slug: "industria-manufatura",   name: "Indústria e Manufatura",   count: 98  },
  { slug: "tecnologia-informatica", name: "Tecnologia e Informática", count: 43  },
  { slug: "servicos-empresariais",  name: "Serviços Empresariais",    count: 37  },
  { slug: "limpeza-higiene",        name: "Limpeza e Higiene",        count: 29  },
  { slug: "agronegocio",            name: "Agronegócio",              count: 48  },
  { slug: "outro",                  name: "Outro setor",              count: null },
];

const FREQUENCIES = [
  { value: "daily",        label: "Toda semana",   sub: "Tenho necessidades frequentes e recorrentes" },
  { value: "monthly",      label: "Todo mês",      sub: "Faço pedidos regulares com certa periodicidade" },
  { value: "occasionally", label: "Eventualmente", sub: "Compro por projeto ou demanda pontual" },
];

const STORAGE_KEY = "girob2b_onboarding_v1";
const TOTAL_STEPS = 4;

// ─── Sub-components fora do componente principal (evita remount a cada render) ─

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i + 1 < current    ? "w-6 bg-[color:var(--brand-green-600)]"
            : i + 1 === current ? "w-8 bg-[color:var(--brand-green-600)]"
            : "w-6 bg-slate-200"
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-slate-400">{current}/{total}</span>
    </div>
  );
}

function GiroLogo() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand-green-600)_0%,var(--brand-green-700)_100%)] text-2xl font-bold text-white shadow-[0_12px_28px_rgba(18,199,104,0.22)]">
      G
    </div>
  );
}

interface StepWrapperProps { step: Step; direction: Direction; children: React.ReactNode }
function StepWrapper({ step, direction, children }: StepWrapperProps) {
  return (
    <div key={step} className={direction === "forward" ? "step-forward" : "step-backward"}>
      {children}
    </div>
  );
}

interface HeaderProps {
  step: Step;
  total: number;
  title: string;
  sub: string;
  onBack: () => void;
}
function Header({ step, total, title, sub, onBack }: HeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {step > 1
          ? <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          : <span />
        }
        <ProgressDots current={step} total={total} />
      </div>
      <div className="space-y-1 text-center">
        <GiroLogo />
        {step === 1 && (
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--brand-green-700)] pt-2">
            GiroB2B · Primeiros passos
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 pt-1">{title}</h1>
        <p className="text-sm text-slate-500 leading-relaxed">{sub}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingForm() {
  const [state, action, pending] = useActionState(completeOnboarding, undefined);

  const [step,      setStep]      = useState<Step>(1);
  const [direction, setDirection] = useState<Direction>("forward");

  const [segment,            setSegment]            = useState<Segment | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategory,     setCustomCategory]     = useState("");
  const [purchaseFrequency,  setPurchaseFrequency]  = useState<string | null>(null);

  const [cnpjRaw,   setCnpjRaw]   = useState("");
  const [tradeName, setTradeName] = useState("");
  const [phone,      setPhone]      = useState("");
  const [cnpjChecking, setCnpjChecking] = useState(false);
  const [cnpjError,    setCnpjError]    = useState<string | null>(null);

  const isSupplier = segment === "supplier" || segment === "both";

  async function checkCNPJ(cnpj: string) {
    const cleaned = cleanCNPJ(cnpj);
    if (cleaned.length !== 14) return;

    setCnpjChecking(true);
    setCnpjError(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const res = await fetch(`${backendUrl}/cnpj/${cleaned}`);
      const data = await res.json();

      if (!res.ok) {
        setCnpjError(data.error || "CNPJ inválido ou inativo.");
      } else {
        if (data.nome_fantasia && !tradeName) {
          setTradeName(data.nome_fantasia);
        } else if (data.razao_social && !tradeName) {
          setTradeName(data.razao_social);
        }
      }
    } catch (err) {
      console.error("Erro ao validar CNPJ:", err);
    } finally {
      setCnpjChecking(false);
    }
  }

  // ── localStorage restore ────────────────────────────────────────────────────
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.segment)            setSegment(d.segment);
      if (d.selectedCategories) setSelectedCategories(d.selectedCategories);
      if (d.customCategory)     setCustomCategory(d.customCategory);
      if (d.purchaseFrequency)  setPurchaseFrequency(d.purchaseFrequency);
      if (d.cnpjRaw)            setCnpjRaw(d.cnpjRaw);
      if (d.tradeName)          setTradeName(d.tradeName);
      if (d.phone)              setPhone(d.phone);
      if (d.step && d.step > 1) setStep(d.step);
    } catch { /* ignore */ }
  }, []);

  // ── localStorage persist ────────────────────────────────────────────────────
  useEffect(() => {
    if (!restoredRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step, segment, selectedCategories, customCategory,
        purchaseFrequency, cnpjRaw, tradeName, phone,
      }));
    } catch { /* ignore */ }
  }, [step, segment, selectedCategories, customCategory, purchaseFrequency, cnpjRaw, tradeName, phone]);

  function handleCNPJChange(value: string) {
    const formatted = formatCNPJ(value);
    setCnpjRaw(formatted);
    if (cleanCNPJ(formatted).length === 14) {
      checkCNPJ(formatted);
    } else {
      setCnpjError(null);
    }
  }

  function toggleCategory(slug: string) {
    setSelectedCategories(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug)
      : prev.length < 3  ? [...prev, slug]
      : prev
    );
  }

  function canAdvance(): boolean {
    if (step === 1) return segment !== null;
    if (step === 2) {
      if (selectedCategories.includes("outro")) return customCategory.trim().length >= 2;
      return selectedCategories.length > 0;
    }
    if (step === 3) {
      if (!isSupplier) return purchaseFrequency !== null;
      return cleanCNPJ(cnpjRaw).length === 14 && tradeName.trim().length >= 2 && phone.trim().length >= 10;
    }
    return true;
  }

  function advance() { if (canAdvance()) { setDirection("forward");  setStep(s => (s + 1) as Step); } }
  function back()    {                    setDirection("backward"); setStep(s => (s - 1) as Step);   }

  // localStorage é limpo somente após redirect bem-sucedido (via middleware/layout
  // que verifica onboarding_complete no DB). Não limpar aqui para preservar o estado
  // caso a server action retorne erro.

  // ── Shared header props helper ──────────────────────────────────────────────
  const headerProps = (title: string, sub: string) => ({
    step, total: TOTAL_STEPS, title, sub, onBack: back,
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Qual o seu papel?
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 1) return (
    <StepWrapper step={step} direction={direction}>
      <div className="w-full max-w-lg space-y-6">
        <Header {...headerProps("Como você vai usar a plataforma?", "Isso personaliza sua experiência. Você pode ajustar depois no perfil.")} />
        <div className="space-y-3">
          {SEGMENTS.map(({ value, title, description, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSegment(value)}
              className={`w-full rounded-2xl border p-5 text-left transition-all ${
                segment === value
                  ? "border-[color:var(--brand-green-500)] bg-[color:var(--brand-green-50)] ring-2 ring-[color:var(--brand-green-400)]/30"
                  : "border-slate-200 bg-white hover:border-[color:var(--brand-green-300)] hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  segment === value ? "bg-[color:var(--brand-green-600)] text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{description}</p>
                </div>
                {segment === value && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--brand-green-600)]" />}
              </div>
            </button>
          ))}
        </div>
        <Button
          type="button" size="lg"
          className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,var(--brand-green-600)_0%,var(--brand-green-700)_100%)] text-base font-semibold text-white shadow-[0_12px_28px_rgba(18,199,104,0.18)] hover:opacity-95 disabled:opacity-40"
          disabled={!segment}
          onClick={advance}
        >
          Continuar
        </Button>
      </div>
    </StepWrapper>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Segmentos
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 2) {
    const primaryCat = CATEGORIES.find(c => selectedCategories[0] === c.slug);

    return (
      <StepWrapper step={step} direction={direction}>
        <div className="w-full max-w-lg space-y-6">
          <Header {...headerProps(
            isSupplier ? "Em qual segmento você atua?" : "O que você precisa comprar?",
            isSupplier ? "Selecione até 3 categorias que representam sua empresa." : "Selecione até 3 categorias que você costuma buscar.",
          )} />

          <div className="grid grid-cols-2 gap-2.5">
            {CATEGORIES.map(({ slug, name, count }) => {
              const selected = selectedCategories.includes(slug);
              const disabled = !selected && selectedCategories.length >= 3;
              return (
                <button
                  key={slug}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleCategory(slug)}
                  className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-all ${
                    selected
                      ? "border-[color:var(--brand-green-500)] bg-[color:var(--brand-green-50)] ring-2 ring-[color:var(--brand-green-400)]/25"
                      : disabled
                        ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-40"
                        : "border-slate-200 bg-white hover:border-[color:var(--brand-green-300)] hover:bg-slate-50"
                  }`}
                >
                  <div className="flex w-full items-center gap-2">
                    <span className={`flex-1 text-sm font-medium leading-tight ${selected ? "text-[color:var(--brand-green-800)]" : "text-slate-700"}`}>
                      {name}
                    </span>
                    {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[color:var(--brand-green-600)]" />}
                  </div>
                  {slug !== "outro" && count !== null && (
                    <span className={`mt-1 text-xs ${selected ? "text-[color:var(--brand-green-600)]" : "text-slate-400"}`}>
                      {count} fornecedores
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedCategories.includes("outro") && (
            <div className="space-y-1.5 rounded-xl border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] px-4 py-3">
              <Label htmlFor="custom_category" className="text-sm font-medium text-[color:var(--brand-green-800)]">
                Qual é o seu setor?
              </Label>
              <Input
                id="custom_category"
                placeholder="Ex: Móveis planejados, Produtos veterinários..."
                className="h-10 border-[color:var(--brand-green-200)] bg-white focus-visible:border-[color:var(--brand-green-500)] focus-visible:ring-[color:var(--brand-green-100)]"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-[color:var(--brand-green-700)]">Vamos usar isso para melhorar nossas categorias.</p>
            </div>
          )}

          {primaryCat && primaryCat.slug !== "outro" && primaryCat.count && (
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{primaryCat.count} fornecedores</span>{" "}
                de {primaryCat.name.toLowerCase()} já estão na plataforma.
              </p>
            </div>
          )}

          {selectedCategories.length >= 3 && (
            <p className="text-center text-xs text-slate-400">Máximo de 3 categorias selecionadas.</p>
          )}

          <Button
            type="button" size="lg"
            className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,var(--brand-green-600)_0%,var(--brand-green-700)_100%)] text-base font-semibold text-white shadow-[0_12px_28px_rgba(18,199,104,0.18)] hover:opacity-95 disabled:opacity-40"
            disabled={!canAdvance()}
            onClick={advance}
          >
            Continuar
          </Button>
        </div>
      </StepWrapper>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 3a — Frequência de compra (comprador)
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 3 && !isSupplier) return (
    <StepWrapper step={step} direction={direction}>
      <div className="w-full max-w-lg space-y-6">
        <Header {...headerProps("Com que frequência você compra?", "Isso nos ajuda a mostrar o conteúdo mais relevante para você.")} />
        <div className="space-y-3">
          {FREQUENCIES.map(({ value, label, sub }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPurchaseFrequency(value)}
              className={`w-full rounded-2xl border p-4 text-left transition-all ${
                purchaseFrequency === value
                  ? "border-[color:var(--brand-green-500)] bg-[color:var(--brand-green-50)] ring-2 ring-[color:var(--brand-green-400)]/30"
                  : "border-slate-200 bg-white hover:border-[color:var(--brand-green-300)] hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{label}</p>
                  <p className="text-sm text-slate-500">{sub}</p>
                </div>
                {purchaseFrequency === value && <CheckCircle2 className="h-5 w-5 shrink-0 text-[color:var(--brand-green-600)]" />}
              </div>
            </button>
          ))}
        </div>
        <Button
          type="button" size="lg"
          className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,var(--brand-green-600)_0%,var(--brand-green-700)_100%)] text-base font-semibold text-white shadow-[0_12px_28px_rgba(18,199,104,0.18)] hover:opacity-95 disabled:opacity-40"
          disabled={!purchaseFrequency}
          onClick={advance}
        >
          Continuar
        </Button>
      </div>
    </StepWrapper>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 3b — Dados da empresa (fornecedor/ambos)
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 3 && isSupplier) return (
    <StepWrapper step={step} direction={direction}>
      <div className="w-full max-w-lg space-y-6">
        <Header {...headerProps("Dados da empresa", "Preencha os dados da sua empresa para continuar.")} />
        <div className="space-y-4 rounded-2xl border border-border/60 bg-white/80 p-5 shadow-sm">
          {/* CNPJ */}
          <div className="space-y-2">
            <Label htmlFor="cnpj_input" className="flex items-center gap-2 text-sm font-medium">
              <Hash className="h-4 w-4 text-[color:var(--brand-green-700)]" />
              CNPJ da empresa
            </Label>
            <div className="relative">
              <Input
                id="cnpj_input"
                placeholder="00.000.000/0001-00"
                className={`h-11 border-slate-200 focus-visible:border-[color:var(--brand-green-500)] focus-visible:ring-[color:var(--brand-green-100)] ${
                  cnpjError ? "border-red-500" : ""
                }`}
                value={cnpjRaw}
                onChange={e => handleCNPJChange(e.target.value)}
                maxLength={18}
              />
              {cnpjChecking && (
                <div className="absolute right-3 top-3">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              )}
            </div>
            {cnpjError && (
              <p className="text-xs font-medium text-red-500">{cnpjError}</p>
            )}
          </div>

          {/* Nome Fantasia */}
          <div className="space-y-2">
            <Label htmlFor="trade_name_input" className="flex items-center gap-2 text-sm font-medium">
              <Store className="h-4 w-4 text-[color:var(--brand-green-700)]" />
              Nome Fantasia
            </Label>
            <Input
              id="trade_name_input"
              placeholder="Como sua empresa é conhecida"
              className="h-11 border-slate-200 focus-visible:border-[color:var(--brand-green-500)] focus-visible:ring-[color:var(--brand-green-100)]"
              value={tradeName}
              onChange={e => setTradeName(e.target.value)}
            />
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="phone_input" className="flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4 text-[color:var(--brand-green-700)]" />
              Telefone comercial
            </Label>
            <Input
              id="phone_input"
              type="tel"
              placeholder="(11) 99999-9999"
              className="h-11 border-slate-200 focus-visible:border-[color:var(--brand-green-500)] focus-visible:ring-[color:var(--brand-green-100)]"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
        </div>

        <Button
          type="button" size="lg"
          className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,var(--brand-green-600)_0%,var(--brand-green-700)_100%)] text-base font-semibold text-white shadow-[0_12px_28px_rgba(18,199,104,0.18)] hover:opacity-95 disabled:opacity-40"
          disabled={!canAdvance()}
          onClick={advance}
        >
          Continuar
        </Button>
      </div>
    </StepWrapper>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 4 — Resumo
  // ══════════════════════════════════════════════════════════════════════════
  const segmentLabel = segment === "buyer" ? "Comprador" : segment === "supplier" ? "Fornecedor" : "Comprador & Fornecedor";
  const segmentIcon  = segment === "buyer" ? "🛒" : segment === "supplier" ? "🏭" : "🔄";
  const frequencyLabel = FREQUENCIES.find(f => f.value === purchaseFrequency)?.label;
  const selectedCats   = CATEGORIES.filter(c => selectedCategories.includes(c.slug));
  const companyLabel   = isSupplier ? tradeName : null;
  const locationLabel  = null;
  const primaryCat     = selectedCats[0];
  const activeCTA = isSupplier
    ? { icon: "📈", text: "Seu perfil começa 20% completo. Complete para aparecer mais nas buscas e receber mais cotações." }
    : primaryCat && primaryCat.slug !== "outro" && primaryCat.count
      ? { icon: "🔍", text: `Há ${primaryCat.count} fornecedores de ${primaryCat.name.toLowerCase()} prontos para receber sua cotação.` }
      : { icon: "🔍", text: "Explore os fornecedores disponíveis e envie sua primeira cotação." };

  return (
    <StepWrapper step={step} direction={direction}>
      <div className="w-full max-w-lg space-y-6">
        <Header {...headerProps("Tudo pronto para começar!", "Revise suas escolhas. Você pode personalizar mais no seu perfil.")} />

        <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] px-4 py-3.5">
          <span className="text-xl mt-0.5">{activeCTA.icon}</span>
          <p className="text-sm leading-relaxed text-[color:var(--brand-green-800)]">{activeCTA.text}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{segmentIcon}</span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tipo de conta</p>
              <p className="font-semibold text-slate-900">{segmentLabel}</p>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {isSupplier ? "Segmentos de atuação" : "Categorias de interesse"}
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedCats.map(c => (
                <span
                  key={c.slug}
                  className="flex items-center gap-1.5 rounded-full bg-[color:var(--brand-green-50)] px-3 py-1 text-sm font-medium text-[color:var(--brand-green-800)] border border-[color:var(--brand-green-200)]"
                >
                  {c.slug === "outro" && customCategory ? customCategory : c.name}
                </span>
              ))}
            </div>
          </div>

          {!isSupplier && frequencyLabel && (
            <>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center gap-3">
                <span className="text-2xl">🗓️</span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Frequência de compra</p>
                  <p className="font-semibold text-slate-900">{frequencyLabel}</p>
                </div>
              </div>
            </>
          )}

          {isSupplier && companyLabel && (
            <>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏢</span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Empresa</p>
                  <p className="font-semibold text-slate-900">{companyLabel}</p>
                  {locationLabel && <p className="text-sm text-slate-500">{locationLabel}</p>}
                </div>
              </div>
            </>
          )}
        </div>

        <form action={action} className="space-y-4">
          <input type="hidden" name="segment"            value={segment ?? ""} />
          <input type="hidden" name="segments_json"      value={JSON.stringify(selectedCategories)} />
          <input type="hidden" name="custom_category"    value={customCategory} />
          <input type="hidden" name="purchase_frequency" value={purchaseFrequency ?? ""} />
          {isSupplier && (
            <>
              <input type="hidden" name="cnpj"       value={cleanCNPJ(cnpjRaw)} />
              <input type="hidden" name="trade_name" value={tradeName} />
              <input type="hidden" name="phone"      value={phone} />
            </>
          )}

          {(state?.message || state?.errors) && (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 space-y-1">
              {state.message && (
                <p className="text-sm font-medium text-destructive">{state.message}</p>
              )}
              {state.errors && Object.values(state.errors).flat().map((err, i) => (
                <p key={i} className="text-sm font-medium text-destructive">{err}</p>
              ))}
            </div>
          )}

          <Button
            type="submit" size="lg"
            className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,var(--brand-green-600)_0%,var(--brand-green-700)_100%)] text-base font-semibold text-white shadow-[0_12px_28px_rgba(18,199,104,0.18)] hover:opacity-95"
            disabled={pending}
          >
            {pending
              ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</span>
              : "Entrar na plataforma →"
            }
          </Button>
        </form>
      </div>
    </StepWrapper>
  );
}
