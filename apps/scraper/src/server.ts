import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import healthRoutes from "./routes/health.js";
import jobsRoutes from "./routes/jobs.js";
import companiesRoutes from "./routes/companies.js";
import { searchWorker } from "./workers/search-worker.js";

const app = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport: config.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } }
      : undefined,
  },
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(healthRoutes);
await app.register(jobsRoutes);
await app.register(companiesRoutes);

app.get("/", async () => ({
  service: "girob2b-scraper",
  version: "0.1.0",
  endpoints: [
    "GET  /health",
    "POST /jobs/search",
    "GET  /jobs/:id",
    "GET  /jobs/:id/stream",
    "GET  /companies/:id|:cnpj",
    "POST /companies/:id/contact",
    "DELETE /companies/:cnpj",
  ],
}));

try {
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
  logger.info(`🕷  Scraper GiroB2B rodando em http://localhost:${config.PORT}`);
} catch (err) {
  logger.error({ err }, "Falha ao subir scraper");
  process.exit(1);
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down scraper...");
  await Promise.allSettled([
    searchWorker.close(),
    app.close(),
  ]);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
