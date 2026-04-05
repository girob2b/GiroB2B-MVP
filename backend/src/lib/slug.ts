export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function productSlug(name: string, city: string, state: string): string {
  return `${slugify(name)}-${slugify(city)}-${slugify(state)}`;
}

export function supplierSlug(tradeName: string, city: string): string {
  return `${slugify(tradeName)}-${slugify(city)}`;
}
