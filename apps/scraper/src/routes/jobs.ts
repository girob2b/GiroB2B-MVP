import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { searchQueue } from "../plugins/queue.js";
import { queryCacheKey } from "../services/dedup.js";
import { getCachedSearch } from "../services/cache.js";
import { createSubscriber } from "../services/pubsub.js";
import { logger } from "../lib/logger.js";

const searchSchema = z.object({
  query: z.string().min(2).max(200),
  filters: z.object({
    state: z.string().length(2).optional(),
    segment_slug: z.string().optional(),
  }).optional(),
  user_id: z.string().uuid().optional(),
});

/**
 * Rotas de jobs de busca.
 * Ver docs/WEB_SCRAPING.md §6.
 */
export default async function jobsRoutes(app: FastifyInstance) {
  // ── POST /jobs/search ─────────────────────────────────────────────
  app.post("/jobs/search", async (req, reply) => {
    const parsed = searchSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }

    const { query, filters = {}, user_id } = parsed.data;

    // Cache hit?
    const cached = await getCachedSearch(query, filters);
    if (cached && cached.length > 0) {
      logger.info({ query, count: cached.length }, "Cache hit");
      return reply.send({ cached: true, companies: cached });
    }

    const cacheKey = queryCacheKey(query, filters);

    const job = await searchQueue.add(
      "search",
      { query, filters, user_id, cacheKey },
      { jobId: crypto.randomUUID() }
    );

    logger.info({ jobId: job.id, query, user_id }, "Job enfileirado");

    return reply.code(202).send({
      cached: false,
      jobId: job.id,
      estimatedSeconds: 15,
    });
  });

  // ── GET /jobs/:id (polling fallback) ──────────────────────────────
  app.get<{ Params: { id: string } }>("/jobs/:id", async (req, reply) => {
    const job = await searchQueue.getJob(req.params.id);
    if (!job) return reply.code(404).send({ error: "job_not_found" });

    const state = await job.getState();
    return {
      id: job.id,
      status: state,
      progress: typeof job.progress === "number" ? job.progress : 0,
      data: job.returnvalue ?? null,
    };
  });

  // ── GET /jobs/:id/stream (SSE) ────────────────────────────────────
  app.get<{ Params: { id: string } }>("/jobs/:id/stream", async (req, reply) => {
    const { id } = req.params;
    const job = await searchQueue.getJob(id);
    if (!job) return reply.code(404).send({ error: "job_not_found" });

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    });

    const write = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Se job já está completo, envia snapshot e encerra
    const state = await job.getState();
    if (state === "completed") {
      write("done", job.returnvalue ?? { companies: [] });
      reply.raw.end();
      return;
    }
    if (state === "failed") {
      write("error", { message: job.failedReason ?? "unknown" });
      reply.raw.end();
      return;
    }

    // Assina pub/sub Redis e encaminha eventos ao cliente
    const sub = createSubscriber(id, (ev) => {
      write(ev.type, ev.data);
      if (ev.type === "done" || ev.type === "error") {
        sub.close().then(() => reply.raw.end());
      }
    });

    // Keep-alive a cada 15s
    const keepAlive = setInterval(() => {
      reply.raw.write(`: keep-alive\n\n`);
    }, 15_000);

    req.raw.on("close", async () => {
      clearInterval(keepAlive);
      await sub.close();
      reply.raw.end();
    });
  });
}
