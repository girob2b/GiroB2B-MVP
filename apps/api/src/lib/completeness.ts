/**
 * Completude do perfil do fornecedor (0-100).
 *
 * Pesos seguem RN-02.01 (`docs/foundational/fase1_fundacao/1.6_REGRAS_DE_NEGOCIO.md`):
 *
 *   Logo                                 10%
 *   Descrição (≥100 chars)               15%
 *   Endereço (cidade + estado)           10%
 *   Telefone                             10%
 *   Pelo menos 1 categoria               10%
 *   Pelo menos 3 produtos                20%
 *   1+ foto em CADA produto ativo        15%   (cobertura: todos os ativos têm ≥1 foto)
 *   Horário de funcionamento              5%
 *   Ano de fundação                       5%
 *                                       ───
 *                                       100%
 */
export function calcCompleteness(
  s: {
    description: string | null;
    logo_url: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    categories: string[] | null;
    operating_hours: string | null;
    founded_year: number | null;
  },
  productCount: number,
  productsWithPhotosCount: number
): number {
  let score = 0;

  if (s.logo_url) score += 10;
  if (s.description && s.description.length >= 100) score += 15;
  if (s.city && s.state) score += 10;
  if (s.phone) score += 10;
  if (s.categories && s.categories.length > 0) score += 10;
  if (productCount >= 3) score += 20;
  if (productCount > 0 && productsWithPhotosCount === productCount) score += 15;
  if (s.operating_hours) score += 5;
  if (s.founded_year) score += 5;

  return Math.min(score, 100);
}
