/**
 * Sentry instrumentation — Next.js 15+ entry point.
 * Carregado pelo runtime ANTES de qualquer código de aplicação.
 *
 * Sem `SENTRY_DSN` ou pacote ausente, vira no-op silencioso (não quebra dev).
 * Pra ativar em prod: setar `SENTRY_DSN` no ambiente + `npm install` (já está no package.json).
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  // Import dinâmico com indireção de string para o TS não reclamar quando o
  // pacote ainda não estiver instalado. Vira no-op silencioso se import falhar.
  const sentryPkg = "@sentry/nextjs";

  try {
    if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
      const Sentry = (await import(/* webpackIgnore: true */ sentryPkg)) as unknown as {
        init: (config: Record<string, unknown>) => void;
      };
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV ?? "development",
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
        sendDefaultPii: false,
      });
    }
  } catch (err) {
    console.warn("[sentry] não inicializado:", err instanceof Error ? err.message : err);
  }
}

export async function onRequestError(...args: unknown[]) {
  if (!process.env.SENTRY_DSN) return;
  const sentryPkg = "@sentry/nextjs";
  try {
    const mod = (await import(/* webpackIgnore: true */ sentryPkg)) as unknown as {
      captureRequestError: (...a: unknown[]) => unknown;
    };
    return mod.captureRequestError(...args);
  } catch {
    /* no-op */
  }
}
