/**
 * Utilitários de formatação de preço — client-safe (sem server-only).
 *
 * Exportados aqui para eliminar duplicação entre lib/services/demands.ts
 * (server-only) e componentes client-side como contact-button.tsx.
 *
 * Cleanup item: QA Run A apontou formatPriceBRL duplicada.
 */

/**
 * Formata centavos como "R$ 1.250,00" (locale pt-BR).
 */
export function formatPriceBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
