"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Barra de progresso de navegação.
 *
 * Bug fix vs versão anterior: a barra travava em 85% se o pathname não mudasse
 * (link pra mesma rota, anchor com #hash, target="_blank", click cancelado, etc.).
 *
 * Estratégia robusta:
 *  - Inicia ao detectar click em link interno legítimo (filtra modifiers/blank/download/hash).
 *  - Completa quando pathname OU searchParams mudarem.
 *  - Fallback: completa após MAX_DURATION mesmo se nada mudar (cobre todos os edge cases).
 */
const MAX_DURATION = 4000; // ms — timeout máximo antes de auto-completar

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navKey = `${pathname}?${searchParams?.toString() ?? ""}`;

  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevKey = useRef(navKey);
  const completing = useRef(false);

  // ── Detect link clicks → start bar ─────────────────────────────────────
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Ignora cliques com modifiers (ctrl/cmd/shift/alt/middle = nova aba)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      const anchor = (e.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";
      const target = anchor.getAttribute("target");
      const isDownload = anchor.hasAttribute("download");
      const isExternal = href.startsWith("http") || href.startsWith("//") || href.startsWith("mailto:") || href.startsWith("tel:");
      const isHashOnly = href.startsWith("#");

      if (!href || isExternal || isHashOnly || isDownload || target === "_blank") return;

      // Mesma rota? Não dispara — não há navegação.
      try {
        const url = new URL(href, window.location.href);
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
          return;
        }
      } catch {
        return;
      }

      start();
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // ── Pathname/search mudou → completa ───────────────────────────────────
  useEffect(() => {
    if (navKey === prevKey.current) return;
    prevKey.current = navKey;
    complete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navKey]);

  function start() {
    if (completing.current) return;
    if (tickRef.current !== null) clearInterval(tickRef.current);
    if (fallbackRef.current !== null) clearTimeout(fallbackRef.current);
    if (hideRef.current !== null) clearTimeout(hideRef.current);

    setWidth(15);
    setVisible(true);
    completing.current = false;

    let current = 15;
    tickRef.current = setInterval(() => {
      const step = Math.random() * 8 * (1 - current / 85);
      current = Math.min(current + step, 85);
      setWidth(current);
    }, 350);

    // Fallback: se nada acontecer em MAX_DURATION, força conclusão.
    fallbackRef.current = setTimeout(() => complete(), MAX_DURATION);
  }

  function complete() {
    if (tickRef.current !== null) clearInterval(tickRef.current);
    if (fallbackRef.current !== null) clearTimeout(fallbackRef.current);
    if (!visible && width === 0) return; // não havia barra ativa

    completing.current = true;
    setWidth(100);

    hideRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
      completing.current = false;
    }, 250);
  }

  // Cleanup
  useEffect(() => () => {
    if (tickRef.current !== null) clearInterval(tickRef.current);
    if (fallbackRef.current !== null) clearTimeout(fallbackRef.current);
    if (hideRef.current !== null) clearTimeout(hideRef.current);
  }, []);

  if (!visible && width === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 right-0 z-[9999] h-[2.5px]"
    >
      <div
        className="h-full origin-left"
        style={{
          width: `${width}%`,
          background: "var(--brand-primary-500)",
          transition: width === 100 ? "width 200ms ease-out" : "width 350ms ease-out",
          boxShadow: "0 0 8px 1px var(--brand-primary-300)",
        }}
      />
    </div>
  );
}
