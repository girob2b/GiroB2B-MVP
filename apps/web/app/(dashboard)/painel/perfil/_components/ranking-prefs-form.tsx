"use client";

/**
 * RankingPrefsForm — configuração de preferências do comparador de cotações.
 *
 * Fase 2a do Comparador de Cotações (feat/comparador-cotacoes, 2026-06-27).
 *
 * Permite ao comprador definir:
 *   - Pesos de ranqueamento (preço / prazo / distância) via presets ou sliders.
 *     Os três pesos devem somar 100% — a UI garante isso via auto-redistribuição.
 *   - Preferência de pagamento (multi-select de pills): cotações que aceitam esses
 *     métodos ganham badge "Aceita seu pagamento" no comparador.
 *     Não entra no score ponderado — é filtro/match de destaque.
 *
 * Chama updateBuyerRankingPrefsAction (Server Action).
 * Só renderiza para compradores (effectiveView === "buyer") — verificado no ProfileForm.
 *
 * Defensivo: migration 052 pode não estar aplicada. A prop initialWeights pode ser
 * null (não configurado → usa defaults do sistema exibidos na UI).
 */

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateBuyerRankingPrefsAction } from "@/app/actions/buyer-ranking-prefs";
import type { OfferPaymentMethod } from "@/lib/schemas/leads";

// ── Constantes ────────────────────────────────────────────────────────────────

/** Formas de pagamento disponíveis como preferência do comprador. */
const PAYMENT_METHODS: Array<{ value: OfferPaymentMethod; label: string }> = [
  { value: "a_vista", label: "À vista" },
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "cartao", label: "Cartão" },
  { value: "parcelado", label: "Parcelado" },
  { value: "faturado_30d", label: "Fat. 30 dias" },
];

/**
 * Presets de pesos em percentual inteiro (cada um soma 100).
 * Refletem casos de uso B2B comuns.
 */
const PRESETS = [
  { id: "balanced", label: "Padrão (balanceado)", price: 50, deadline: 30, distance: 20 },
  { id: "cheapest", label: "Mais barato", price: 80, deadline: 10, distance: 10 },
  { id: "fastest", label: "Mais rápido", price: 20, deadline: 70, distance: 10 },
  { id: "nearest", label: "Mais perto", price: 20, deadline: 10, distance: 70 },
] as const;

type PresetId = (typeof PRESETS)[number]["id"] | "custom";

/** Pesos em percentual inteiro (0–100), somando 100. */
interface WeightPercent {
  price: number;
  deadline: number;
  distance: number;
}

const DEFAULT_PERCENT: WeightPercent = { price: 50, deadline: 30, distance: 20 };

// ── Props ─────────────────────────────────────────────────────────────────────

export interface RankingPrefsFormProps {
  /**
   * Pesos atuais vindos do banco (0–1 cada).
   * null → não configurado (usa defaults do sistema = Padrão balanceado).
   * Defensivo: migration 052 pode não estar aplicada.
   */
  initialWeights: { price: number; deadline: number; distance: number } | null;
  /**
   * Preferência de pagamento atual.
   * null → não configurado (sem preferência = todas as cotações "matcham").
   */
  initialPaymentPreference: string[] | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toPercent(w: { price: number; deadline: number; distance: number }): WeightPercent {
  return {
    price: Math.round(w.price * 100),
    deadline: Math.round(w.deadline * 100),
    distance: Math.round(w.distance * 100),
  };
}

function toWeights(p: WeightPercent): { price: number; deadline: number; distance: number } {
  const sum = p.price + p.deadline + p.distance;
  if (sum === 0) return { price: 1 / 3, deadline: 1 / 3, distance: 1 / 3 };
  return {
    price: p.price / sum,
    deadline: p.deadline / sum,
    distance: p.distance / sum,
  };
}

function detectPreset(p: WeightPercent): PresetId {
  for (const preset of PRESETS) {
    if (preset.price === p.price && preset.deadline === p.deadline && preset.distance === p.distance) {
      return preset.id;
    }
  }
  return "custom";
}

/**
 * Quando o usuário move um slider, redistribui o restante proporcionalmente
 * entre os outros dois campos (rounding-safe: o total sempre fica em 100).
 */
function redistribute(
  changed: keyof WeightPercent,
  newValue: number,
  prev: WeightPercent
): WeightPercent {
  const clamped = Math.min(100, Math.max(0, Math.round(newValue)));
  const remaining = 100 - clamped;
  const others = (["price", "deadline", "distance"] as const).filter(
    (k) => k !== changed
  ) as [keyof WeightPercent, keyof WeightPercent];
  const sumOthers = prev[others[0]] + prev[others[1]];

  let a: number, b: number;
  if (sumOthers === 0) {
    a = Math.round(remaining / 2);
    b = remaining - a;
  } else {
    a = Math.round((prev[others[0]] / sumOthers) * remaining);
    b = remaining - a;
  }

  return {
    ...prev,
    [changed]: clamped,
    [others[0]]: Math.max(0, a),
    [others[1]]: Math.max(0, b),
  };
}

// ── Componente principal ──────────────────────────────────────────────────────

export function RankingPrefsForm({
  initialWeights,
  initialPaymentPreference,
}: RankingPrefsFormProps) {
  const initPercent = initialWeights ? toPercent(initialWeights) : DEFAULT_PERCENT;

  const [percent, setPercent] = useState<WeightPercent>(initPercent);
  const [preset, setPreset] = useState<PresetId>(() => detectPreset(initPercent));
  const [paymentMethods, setPaymentMethods] = useState<OfferPaymentMethod[]>(
    () => (initialPaymentPreference ?? []) as OfferPaymentMethod[]
  );
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const total = percent.price + percent.deadline + percent.distance;
  const isValid = total === 100;

  function applyPreset(p: (typeof PRESETS)[number]) {
    setPercent({ price: p.price, deadline: p.deadline, distance: p.distance });
    setPreset(p.id);
    setSaved(false);
  }

  function handleSlider(field: keyof WeightPercent, value: number) {
    setPreset("custom");
    setSaved(false);
    setPercent((prev) => redistribute(field, value, prev));
  }

  function togglePayment(method: OfferPaymentMethod) {
    setSaved(false);
    setPaymentMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    );
  }

  function handleSave() {
    if (!isValid) return;
    startTransition(async () => {
      const result = await updateBuyerRankingPrefsAction({
        ranking_weights: toWeights(percent),
        payment_preference: paymentMethods.length > 0 ? paymentMethods : null,
      });
      if (result.ok) {
        setSaved(true);
        toast.success("Preferências de ranqueamento salvas.");
      } else {
        toast.error(result.error ?? "Erro ao salvar preferências.");
      }
    });
  }

  function handleReset() {
    applyPreset(PRESETS[0]);
    setPaymentMethods([]);
    setSaved(false);
    startTransition(async () => {
      const result = await updateBuyerRankingPrefsAction({
        ranking_weights: null,
        payment_preference: null,
      });
      if (result.ok) {
        toast.success("Preferências resetadas para o padrão.");
      } else {
        toast.error(result.error ?? "Erro ao resetar.");
      }
    });
  }

  return (
    <Card id="ranking-prefs">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">
            <span className="flex items-center gap-2">
              <SlidersHorizontal
                className="h-4 w-4 text-brand-600"
                aria-hidden="true"
              />
              Preferências de ranqueamento
            </span>
          </CardTitle>
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50"
            title="Resetar para o padrão balanceado"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Padrão
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Define a ordem das cotações no comparador. O fator com maior peso
          influencia mais o score — cotações com melhor resultado nele ficam no
          topo.
        </p>

        {/* ── Presets ── */}
        <section aria-label="Presets de critério" className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Critério</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Presets de ranqueamento">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                aria-pressed={preset === p.id}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  preset === p.id
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPreset("custom")}
              aria-pressed={preset === "custom"}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                preset === "custom"
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700"
              }`}
            >
              Personalizado
            </button>
          </div>
        </section>

        {/* ── Sliders de peso ── */}
        <section aria-label="Pesos dos fatores" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Pesos</p>
            <span
              className={`text-xs font-semibold ${
                isValid ? "text-emerald-700" : "text-red-600"
              }`}
              aria-live="polite"
              aria-atomic="true"
            >
              Total: {total}%{isValid ? "" : " (deve ser 100%)"}
            </span>
          </div>

          <WeightSlider
            id="weight-price"
            label="Preço"
            hint="Menor preço = melhor score"
            value={percent.price}
            onChange={(v) => handleSlider("price", v)}
            trackColor="bg-brand-600"
          />
          <WeightSlider
            id="weight-deadline"
            label="Prazo de entrega"
            hint="Prazo mais curto = melhor score"
            value={percent.deadline}
            onChange={(v) => handleSlider("deadline", v)}
            trackColor="bg-gold-500"
          />
          <WeightSlider
            id="weight-distance"
            label="Distância / região"
            hint="Mesmo estado ou cidade = melhor score"
            value={percent.distance}
            onChange={(v) => handleSlider("distance", v)}
            trackColor="bg-slate-400"
          />
        </section>

        {/* ── Preferência de pagamento ── */}
        <section aria-label="Preferência de pagamento" className="space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Preferência de pagamento
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cotações que aceitam esses métodos ganham o badge{" "}
              <span className="font-medium">&ldquo;Aceita seu pagamento&rdquo;</span> no
              comparador. Não afeta o score ponderado — é destaque visual.
            </p>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Métodos de pagamento preferidos"
          >
            {PAYMENT_METHODS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => togglePayment(value)}
                aria-pressed={paymentMethods.includes(value)}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  paymentMethods.includes(value)
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {paymentMethods.length === 0 && (
            <p className="text-xs text-slate-400">
              Sem preferência — todas as cotações são tratadas da mesma forma.
            </p>
          )}
        </section>

        {/* ── Rodapé: feedback + submit ── */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {saved && !isPending ? (
            <p className="flex items-center gap-1.5 text-sm text-brand-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Salvo
            </p>
          ) : !isValid ? (
            <p className="text-sm text-red-600">
              Os pesos devem somar 100%.
            </p>
          ) : (
            <span />
          )}

          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || !isValid}
            className="btn-primary"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Salvando…
              </span>
            ) : (
              "Salvar preferências"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── WeightSlider ──────────────────────────────────────────────────────────────

function WeightSlider({
  id,
  label,
  hint,
  value,
  onChange,
  trackColor,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  trackColor: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm text-slate-700">
          {label}
          <span className="ml-1.5 text-xs text-muted-foreground">— {hint}</span>
        </label>
        <span
          className="text-sm font-semibold text-slate-900 tabular-nums w-10 text-right"
          aria-live="polite"
          aria-atomic="true"
        >
          {value}%
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 appearance-none rounded-full bg-slate-200 cursor-pointer accent-brand-600"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      />
      {/* Barra visual proporcional ao valor */}
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-slate-100"
        aria-hidden="true"
      >
        <div
          className={`h-full rounded-full ${trackColor}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
