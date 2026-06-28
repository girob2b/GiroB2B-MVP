import Link from "next/link";
import { Send } from "lucide-react";

/**
 * CTA primário "Enviar cotação" para superfícies públicas (home, /buscar, /categoria, relacionadas).
 *
 * Visitante anônimo / comprador logado / não-vendedor:
 * clicar → /seja-vendedor (funil de aquisição de vendedor — gate inalterado).
 *
 * Reframe Fase 1 do comparador de cotações (2026-06-27):
 *   "Enviar cotação" substituiu "Contatar via WhatsApp" como CTA primário do card.
 *   O WhatsApp foi movido para o detalhe da demanda (/demanda/[slug]) — fora do card.
 *   O gate permanece o mesmo: quem não tem conta de vendedor ativa vai para /seja-vendedor.
 *   Na home, compradores logados já são redirecionados para /painel, então na prática
 *   quem vê este botão é sempre anônimo ou comprador.
 *
 * Marca visual: bg-brand-600 (teal primário — token --brand-primary-600).
 * Contraste: texto branco sobre brand-600 ≈ 4.5:1 (passa WCAG AA).
 * Sempre habilitado: o gate acontece no destino (/seja-vendedor), não no botão.
 */
export function PublicContactGate() {
  return (
    <Link
      href="/seja-vendedor"
      aria-label="Enviar cotação para este comprador — precisa de conta de vendedor com plano ativo"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
    >
      <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
      Enviar cotação
    </Link>
  );
}

/**
 * Mantido por compatibilidade de import. Alias de PublicContactGate.
 * @deprecated use `PublicContactGate` diretamente.
 */
export function MockContactGate() {
  return <PublicContactGate />;
}
