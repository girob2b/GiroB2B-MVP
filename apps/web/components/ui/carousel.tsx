"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Carrossel de 1 linha (estilo Mercado Livre) — reutilizável.
 *
 * Uma linha horizontal rolável com scroll-snap + botões prev/next. Os cards são
 * renderizados pelo servidor (RSC) e passados como `children` — este client
 * component só cuida do scroll, das setas e da navegação por teclado. Mantém o
 * conteúdo leve (sem hidratar os cards inteiros).
 *
 * Genérico via props:
 * - `ariaLabel` — rótulo da faixa rolável (`role="region"`).
 * - `itemNoun` — substantivo usado em "{noun} X de N" e nos aria-labels das
 *   setas ("{noun}s anteriores/próximas"). Default "Item".
 * - `accent` — controla a cor das setas (hover) e do focus ring, para que cada
 *   seção mantenha sua identidade visual distinta (ex.: gold p/ demandas,
 *   brand/teal p/ empresas).
 *
 * Acessibilidade:
 * - `role="region"` + aria-label na faixa rolável; `tabIndex=0` para foco.
 * - Setas ←/→ rolam quando a faixa está focada.
 * - Botões prev/next com aria-label; desabilitam nos extremos.
 * - Cada item é um `role="group"` para leitura item-a-item.
 * - Respeita prefers-reduced-motion (scroll sem smooth).
 */
export type CarouselAccent = "gold" | "brand" | "neutral";

/**
 * Classes Tailwind por accent — estáticas (sem interpolação dinâmica) para que
 * o Tailwind v4 detecte e gere cada utilitário no build.
 */
const ACCENT_CLASSES: Record<
  CarouselAccent,
  { arrow: string; ring: string }
> = {
  gold: {
    arrow: "hover:border-gold-300 hover:text-gold-700",
    ring: "focus-visible:ring-gold-500",
  },
  brand: {
    arrow: "hover:border-brand-300 hover:text-brand-700",
    ring: "focus-visible:ring-brand-500",
  },
  neutral: {
    arrow: "hover:border-slate-400 hover:text-slate-900",
    ring: "focus-visible:ring-slate-500",
  },
};

export function Carousel({
  children,
  ariaLabel,
  itemNoun = "Item",
  accent = "gold",
}: {
  children: ReactNode;
  ariaLabel: string;
  itemNoun?: string;
  accent?: CarouselAccent;
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const items = Children.toArray(children);
  const { arrow: arrowAccent, ring: ringAccent } = ACCENT_CLASSES[accent];

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows]);

  const scrollByPage = useCallback((dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Rola ~85% da largura visível (deixa um card de contexto).
    const amount = Math.round(el.clientWidth * 0.85) * dir;
    el.scrollBy({ left: amount, behavior: reduce ? "auto" : "smooth" });
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollByPage(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollByPage(-1);
      }
    },
    [scrollByPage]
  );

  if (items.length === 0) return null;

  return (
    <div className="relative">
      {/* Setas — escondidas em telas sem hover/touch onde o swipe basta */}
      <button
        type="button"
        onClick={() => scrollByPage(-1)}
        disabled={!canPrev}
        aria-label={`${itemNoun}s anteriores`}
        className={`absolute -left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition-all ${arrowAccent} disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 ${ringAccent} focus-visible:ring-offset-2 md:flex`}
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => scrollByPage(1)}
        disabled={!canNext}
        aria-label={`Próximas ${itemNoun.toLowerCase()}s`}
        className={`absolute -right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition-all ${arrowAccent} disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 ${ringAccent} focus-visible:ring-offset-2 md:flex`}
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>

      <ul
        ref={scrollerRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={`-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-none focus-visible:ring-2 ${ringAccent} focus-visible:ring-offset-4 sm:mx-0 sm:px-0`}
      >
        {items.map((child, i) => (
          <li
            key={i}
            role="group"
            aria-label={`${itemNoun} ${i + 1} de ${items.length}`}
            className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[31%] xl:w-[23.5%]"
          >
            {child}
          </li>
        ))}
      </ul>
    </div>
  );
}
