import IORedis, { type Redis } from "ioredis";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

export const redis: Redis = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redis.on("error", (err) => logger.error({ err }, "Redis error"));
redis.on("connect", () => logger.info("Redis conectado"));
redis.on("ready", () => logger.debug("Redis ready"));

export async function pingRedis(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
