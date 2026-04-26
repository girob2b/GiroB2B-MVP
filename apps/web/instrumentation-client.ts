/**
 * Sentry instrumentation — client-side (browser).
 * Carregado automaticamente pelo Next.js 15+.
 *
 * Sem `NEXT_PUBLIC_SENTRY_DSN` vira no-op silencioso.
 */
async function init() {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  // Indireção de string para o TS não falhar enquanto o pacote não estiver instalado.
  const sentryPkg = "@sentry/nextjs";
  try {
    const Sentry = (await import(/* webpackIgnore: true */ sentryPkg)) as unknown as {
      init: (config: Record<string, unknown>) => void;
    };
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: 0.0,
      sendDefaultPii: false,
    });
  } catch (err) {
    console.warn("[sentry-client] não inicializado:", err instanceof Error ? err.message : err);
  }
}

void init();
