/**
 * Mapa estático: slug de categoria → ícone lucide-react (#9 hub-categorias).
 *
 * Fonte: campo `icon` da tabela `categories` contém slug de ícone ou emoji.
 * O frontend mapeia para lucide-react; quando não mapeado, usa o fallback.
 *
 * Dívida aceita (ref: #20 icones-categoria-lucide): banco e front divergem
 * sobre quem manda no ícone. Quando o banco migrar pra slugs padronizados,
 * este mapa continua servindo como lookup.
 */

import {
  Boxes,
  Building2,
  ChefHat,
  Factory,
  Hammer,
  HeartPulse,
  Layers,
  Leaf,
  Monitor,
  Package,
  ShoppingBasket,
  Shirt,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Mapa slug → ícone lucide. Cobre setores B2B brasileiros mais comuns. */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // Slugs inferidos dos nomes das categorias dos mocks
  embalagens: Package,
  "textil-e-confeccao": Shirt,
  "materiais-de-construcao": Hammer,
  "alimentos-e-bebidas": ShoppingBasket,
  autopecas: Wrench,
  "limpeza-e-higiene": Leaf,
  // Slugs de ícones do banco (campo `icon`)
  package: Package,
  factory: Factory,
  shirt: Shirt,
  hammer: Hammer,
  basket: ShoppingBasket,
  truck: Truck,
  wrench: Wrench,
  boxes: Boxes,
  building: Building2,
  // Outros setores B2B
  tecnologia: Monitor,
  saude: HeartPulse,
  agro: Leaf,
  alimentos: ShoppingBasket,
  logistica: Truck,
  industria: Factory,
  construcao: Hammer,
  servicos: Layers,
  alimenticio: ChefHat,
};

/** Ícone padrão quando o slug não está mapeado. */
export const CATEGORY_ICON_FALLBACK: LucideIcon = Building2;

/**
 * Resolve o ícone para uma categoria.
 *
 * @param iconField  Valor do campo `icon` do banco (slug ou emoji ou null).
 * @param slug       Slug da categoria — fallback de lookup quando iconField não bate.
 */
export function getCategoryIcon(
  iconField: string | null,
  slug: string
): LucideIcon {
  if (iconField && CATEGORY_ICON_MAP[iconField]) {
    return CATEGORY_ICON_MAP[iconField];
  }
  if (CATEGORY_ICON_MAP[slug]) {
    return CATEGORY_ICON_MAP[slug];
  }
  return CATEGORY_ICON_FALLBACK;
}
