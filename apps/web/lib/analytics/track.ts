"use client";

import type {
  AnalyticsEventName,
  AnalyticsEventPayload,
} from "./events";

/**
 * Layer abstrata de instrumentação — vendor-agnóstica.
 *
 * Hoje opera como noop em prod (até decisão de provider) e ecoa no console em
 * dev. Quando PostHog/Plausible/GA4 for plugado, basta trocar a impl interna
 * de `track()` — todos os call sites com tipos fortes continuam válidos.
 *
 * Em ambiente de teste (E2E), eventos são empilhados em `window.__analytics`
 * pra Playwright/Cypress assertarem que o funnel dispara corretamente.
 */

type AnalyticsRecord = {
  name: AnalyticsEventName;
  props: AnalyticsEventPayload<AnalyticsEventName>;
  ts: number;
};

declare global {
  interface Window {
    /** Buffer pra E2E inspecionar eventos disparados (não usar em prod-side code). */
    __analytics?: AnalyticsRecord[];
  }
}

const isDev = process.env.NODE_ENV === "development";
const isTest = process.env.NEXT_PUBLIC_E2E === "1";

export function track<E extends AnalyticsEventName>(
  name: E,
  props: AnalyticsEventPayload<E>
): void {
  if (typeof window === "undefined") return;

  const record: AnalyticsRecord = { name, props, ts: Date.now() };

  if (isTest) {
    // Modo E2E: empilha pra spec assertar.
    if (!window.__analytics) window.__analytics = [];
    window.__analytics.push(record);
  }

  if (isDev) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", name, props);
  }

  // TODO: quando o vendor canônico (PostHog) for decidido, plugar aqui:
  //   posthog.capture(name, props);
}
