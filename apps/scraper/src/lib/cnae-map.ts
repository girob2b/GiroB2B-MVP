/**
 * Mapeamento de CNAE (Receita Federal) → segment_slug interno do GiroB2B.
 *
 * Cobre os top CNAEs vistos no catálogo interno. Revisar após 100 buscas reais.
 * Ver docs/WEB_SCRAPING.md §14 ponto aberto #4.
 *
 * Os 5 primeiros dígitos do código CNAE são suficientes pra categorização — o 6º
 * é subclasse detalhada. Comparamos sempre pelos primeiros 5 dígitos.
 */

const CNAE_TO_SEGMENT: Record<string, string> = {
  // ── Embalagens ──
  "22.22-6": "embalagens",
  "22.29-3": "embalagens",
  "17.31-1": "embalagens", // caixas de papelão
  "17.32-0": "embalagens",

  // ── Alimentos e bebidas ──
  "10.11-2": "alimentos-bebidas",
  "10.12-1": "alimentos-bebidas",
  "10.13-9": "alimentos-bebidas",
  "10.20-1": "alimentos-bebidas",
  "10.61-9": "alimentos-bebidas",
  "11.11-9": "alimentos-bebidas", // bebidas
  "46.32-0": "alimentos-bebidas", // atacado alimentos
  "46.37-1": "alimentos-bebidas",

  // ── Materiais de construção ──
  "46.74-5": "materiais-construcao",
  "47.44-0": "materiais-construcao",
  "23.30-3": "materiais-construcao", // cimento/concreto
  "23.42-7": "materiais-construcao",

  // ── Têxtil e confecção ──
  "13.11-1": "textil-confeccao",
  "13.12-0": "textil-confeccao",
  "14.12-6": "textil-confeccao",
  "46.42-7": "textil-confeccao",

  // ── Autopeças ──
  "29.49-2": "autopecas",
  "45.30-7": "autopecas",
  "45.41-2": "autopecas",

  // ── Indústria e manufatura ──
  "28.12-7": "industria-manufatura",
  "28.13-5": "industria-manufatura",
  "28.22-4": "industria-manufatura",
  "28.61-5": "industria-manufatura",
  "25.11-0": "industria-manufatura", // estruturas metálicas
  "25.39-0": "industria-manufatura",

  // ── Tecnologia e informática ──
  "62.01-5": "tecnologia-informatica",
  "62.02-3": "tecnologia-informatica",
  "62.04-0": "tecnologia-informatica",
  "63.11-9": "tecnologia-informatica",
  "46.51-6": "tecnologia-informatica", // atacado de equip. de informática

  // ── Serviços empresariais ──
  "70.20-4": "servicos-empresariais",
  "74.90-1": "servicos-empresariais",
  "82.11-3": "servicos-empresariais",
  "69.20-6": "servicos-empresariais",

  // ── Limpeza e higiene ──
  "20.62-2": "limpeza-higiene",
  "81.21-4": "limpeza-higiene",
  "46.49-4": "limpeza-higiene",

  // ── Agronegócio ──
  "01.11-3": "agronegocio",
  "01.13-0": "agronegocio",
  "01.15-6": "agronegocio",
  "46.23-1": "agronegocio",
};

/**
 * Converte código CNAE (formato: número inteiro como 2222600, 2222601, etc.)
 * para o slug interno correspondente. Retorna null se não houver mapeamento.
 */
export function cnaeToSegmentSlug(cnaeCode: number | string | null | undefined): string | null {
  if (!cnaeCode) return null;

  const str = String(cnaeCode).padStart(7, "0");
  // Formato esperado pela tabela: "XX.XX-X" (primeiros 5 dígitos)
  const formatted = `${str.slice(0, 2)}.${str.slice(2, 4)}-${str.slice(4, 5)}`;

  return CNAE_TO_SEGMENT[formatted] ?? null;
}
