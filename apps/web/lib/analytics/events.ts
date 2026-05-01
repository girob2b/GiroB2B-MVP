/**
 * Taxonomia de eventos da plataforma — fonte canônica.
 *
 * Decisão UX/produto (sessão 2026-04-30): instrumentar funnel de aquisição
 * antes de mexer em qualquer otimização da Explorar. Sem dado, otimização
 * vira fé. North-star funnel = `search_submitted → supplier_card_clicked →
 * inquiry_started → inquiry_sent`.
 *
 * Nomes em snake_case (convenção PostHog/GA4). Adicionar novo evento aqui
 * antes de plugar no código — TypeScript força props corretas em `track()`.
 */
export type AnalyticsEventName =
  | "search_submitted"
  | "search_suggestion_clicked"
  | "supplier_card_clicked"
  | "inquiry_started"
  | "inquiry_sent"
  | "complete_cadastro_card_clicked";

export type AnalyticsEventProps = {
  search_submitted: {
    query: string;
    has_filters: boolean;
    source: "enter_key" | "popular_suggestion" | "recent_suggestion" | "filter_change";
  };
  search_suggestion_clicked: {
    suggestion: string;
    kind: "popular" | "recent";
  };
  supplier_card_clicked: {
    supplier_id: string;
    supplier_slug: string;
    position: number;
    query: string | null;
  };
  inquiry_started: {
    supplier_id: string;
    supplier_slug: string;
    source: "explorar" | "produto_page" | "fornecedor_page";
  };
  inquiry_sent: {
    inquiry_id: string;
    supplier_id: string;
    is_generic: boolean;
    /** Tempo em ms entre `inquiry_started` e `inquiry_sent`. Null se não capturado. */
    time_to_send_ms: number | null;
  };
  complete_cadastro_card_clicked: {
    /** Onde o card estava renderizado quando o user clicou. */
    location: "explorar";
  };
};

export type AnalyticsEventPayload<E extends AnalyticsEventName> = AnalyticsEventProps[E];
