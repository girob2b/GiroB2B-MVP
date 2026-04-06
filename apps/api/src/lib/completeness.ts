/** Calcula completude do perfil do fornecedor (0-100) */
export function calcCompleteness(
  s: {
    trade_name: string | null;
    description: string | null;
    logo_url: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    categories: string[] | null;
    photos: string[] | null;
    website: string | null;
    instagram: string | null;
  },
  productCount: number
): number {
  let score = 0;
  if (s.trade_name) score += 10;
  if (s.description && s.description.length >= 50) score += 20;
  if (s.logo_url) score += 15;
  if (s.phone) score += 5;
  if (s.city && s.state) score += 5;
  if (s.categories && s.categories.length > 0) score += 15;
  if (productCount > 0) score += 15;
  if (s.photos && s.photos.length > 0) score += 10;
  if (s.website || s.instagram) score += 5;
  return Math.min(score, 100);
}
