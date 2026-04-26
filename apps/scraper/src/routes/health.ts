import type { FastifyInstance } from "fastify";
import { pingRedis } from "../plugins/redis.js";
import { pingDb } from "../plugins/db.js";
import { request } from "undici";
import { config } from "../config.js";

export default async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    const [redisOk, dbOk, searxOk] = await Promise.all([
      pingRedis(),
      pingDb(),
      pingSearxng(),
    ]);

    const allOk = redisOk && dbOk && searxOk;

    return {
      status: allOk ? "ok" : "degraded",
      redis: redisOk ? "ok" : "down",
      db: dbOk ? "ok" : "down",
      searxng: searxOk ? "ok" : "down",
      timestamp: new Date().toISOString(),
    };
  });
}

async function pingSearxng(): Promise<boolean> {
  try {
    const { statusCode } = await request(config.SEARXNG_URL, {
      method: "GET",
      headersTimeout: 2000,
      bodyTimeout: 2000,
    });
    return statusCode >= 200 && statusCode < 500;
  } catch {
    return false;
  }
}
