"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Barra de busca persistente no header público.
 *
 * Decisão UX 2026-06-22:
 * - Submit por Enter ou clique na lupa → navega pra /buscar?q=<query>.
 * - Sem busca realtime (convenção do projeto: busca por Enter, não realtime).
 * - Desktop: barra expandida com min-w fixo; responsiva entre logo e ações.
 * - Mobile: ícone de lupa que expande/colapsa uma barra full-width.
 *   Ao expandir, foca automaticamente no input.
 *   Fechar com Escape ou clicando fora (blur).
 */

interface HeaderSearchProps {
  /** Placeholder customizável; padrão alinhado ao produto. */
  placeholder?: string;
  /**
   * Variante do header onde o componente está inserido.
   * "on-brand" = header verde escuro — ajusta o ícone/trigger mobile pra branco.
   * "default"  = header branco — ícone slate (original).
   */
  headerVariant?: "default" | "on-brand";
}

export function HeaderSearch({
  placeholder = "Buscar demandas, produtos, setores…",
  headerVariant = "default",
}: HeaderSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/buscar?q=${encodeURIComponent(q)}`);
    // Colapsa mobile após navegar
    setMobileOpen(false);
  }

  function openMobile() {
    setMobileOpen(true);
    // Foca após o estado re-renderizar
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleBlur() {
    // Fecha mobile ao perder foco somente se vazio
    if (!query.trim()) setMobileOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setQuery("");
      setMobileOpen(false);
    }
  }

  return (
    <>
      {/* ── Desktop: barra inline ─────────────────────────────────────────── */}
      <form
        role="search"
        onSubmit={handleSubmit}
        className="hidden md:flex items-center flex-1 max-w-lg mx-6"
      >
        <label htmlFor="header-search-desktop" className="sr-only">
          Buscar demandas
        </label>
        <div className="relative w-full">
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center"
            aria-hidden="true"
          >
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            id="header-search-desktop"
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-10 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 hover:border-slate-300"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="absolute inset-y-0 right-0 flex items-center px-3 rounded-r-xl text-slate-400 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>

      {/* ── Mobile: lupa que expande ──────────────────────────────────────── */}
      <div className="md:hidden flex items-center">
        {mobileOpen ? (
          /* Barra expandida full-width — ocupa toda a row abaixo do topbar via absolute */
          <form
            role="search"
            onSubmit={handleSubmit}
            className="absolute left-0 top-16 w-full bg-white border-b border-slate-200 px-4 py-2 z-40 shadow-sm"
          >
            <label htmlFor="header-search-mobile" className="sr-only">
              Buscar demandas
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center"
                aria-hidden="true"
              >
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                id="header-search-mobile"
                ref={inputRef}
                type="search"
                name="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              />
            </div>
          </form>
        ) : (
          <button
            type="button"
            aria-label="Abrir busca"
            onClick={openMobile}
            className={
              headerVariant === "on-brand"
                ? "p-2 rounded-lg text-white/90 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                : "p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            }
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </>
  );
}
