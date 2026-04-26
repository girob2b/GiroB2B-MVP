/**
 * Feature flags — alinhado com docs/MVP_SCOPE.md.
 * Rotas continuam existindo pra não perder código; a nav só expõe o que
 * está dentro do Tier 1. Ligar uma flag = item volta pra sidebar.
 */
export const FEATURES = {
  chat: true,               // MVP — chat de negociação
  pipeline: true,            // MVP — pipeline comercial
  comparador: false,        // Fase 2+
  catalogoInterno: true,    // MVP — upload de catálogo PDF/imagem
  importarProdutos: false,  // Tier 3
  webSearch: false,         // Tier 2 (gated por assinatura)
  needs: false,             // Tier 2
} as const;

export type FeatureFlag = keyof typeof FEATURES;
