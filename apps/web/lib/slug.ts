/** Converte texto em slug URL-amigável */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")   // só letras, números, espaços e hífens
    .trim()
    .replace(/\s+/g, "-")           // espaços → hífens
    .replace(/-+/g, "-")            // hífens duplos
    .slice(0, 80);
}

/** Slug de produto: "Embalagens Plásticas" + "São Paulo" + "SP" → "embalagens-plasticas-sao-paulo-sp" */
export function productSlug(name: string, city: string, state: string): string {
  return `${slugify(name)}-${slugify(city)}-${slugify(state)}`;
}

/** Slug de fornecedor: nome fantasia + cidade */
export function supplierSlug(tradeName: string, city: string): string {
  return `${slugify(tradeName)}-${slugify(city)}`;
}
