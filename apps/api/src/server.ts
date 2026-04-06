import Fastify from "fastify";
import corsPlugin    from "./plugins/cors.js";
import authPlugin    from "./plugins/auth.js";
import swaggerPlugin from "./plugins/swagger.js";
import authRoutes    from "./routes/auth.js";
import cnpjRoutes    from "./routes/cnpj.js";
import supplierRoutes from "./routes/supplier.js";
import productRoutes  from "./routes/products.js";
import onboardingRoutes from "./routes/onboarding.js";
import suggestionRoutes from "./routes/suggestions.js";
import inquiryRoutes from "./routes/inquiries.js";
import { healthSchema } from "./lib/api-docs.js";

const app = Fastify({ logger: process.env.NODE_ENV !== "production" });

// ── Plugins ──────────────────────────────────────────────────────────────────
await app.register(swaggerPlugin);
await app.register(corsPlugin);
await app.register(authPlugin);

// ── Routes ───────────────────────────────────────────────────────────────────
await app.register(cnpjRoutes,       { prefix: "/cnpj" });
await app.register(authRoutes,       { prefix: "/auth" });
await app.register(supplierRoutes,   { prefix: "/supplier" });
await app.register(productRoutes,    { prefix: "/products" });
await app.register(onboardingRoutes, { prefix: "/onboarding" });
await app.register(suggestionRoutes, { prefix: "/suggestions" });
await app.register(inquiryRoutes,    { prefix: "/inquiries" });

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", {
  schema: {
    tags: ["Health"],
    summary: "Health check da API",
    response: {
      200: healthSchema,
    },
  },
}, async () => ({ status: "ok", timestamp: new Date().toISOString() }));

// ── Start ────────────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? "3001", 10);

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`🚀 Backend GiroB2B rodando em http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
