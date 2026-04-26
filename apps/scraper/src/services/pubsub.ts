import { redis } from "../plugins/redis.js";
import type { SseEvent } from "../types/index.js";
import IORedis from "ioredis";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

/**
 * Pub/Sub Redis para comunicação entre worker (produtor de eventos)
 * e rota SSE (consumidor). Cada job tem seu canal próprio.
 *
 * Ver docs/WEB_SCRAPING.md §4.
 */

export function jobChannel(jobId: string): string {
  return `scraper:job:${jobId}`;
}

export async function publishJobEvent(jobId: string, event: SseEvent): Promise<void> {
  const payload = JSON.stringify(event);
  try {
    await redis.publish(jobChannel(jobId), payload);
  } catch (err) {
    logger.warn({ err, jobId }, "Falha ao publicar evento");
  }
}

/**
 * Cria um subscriber dedicado (cliente Redis separado — subscribe exige conexão exclusiva).
 * O caller é responsável por fechar.
 */
export function createSubscriber(jobId: string, onEvent: (e: SseEvent) => void) {
  const sub = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
  const channel = jobChannel(jobId);

  sub.subscribe(channel, (err) => {
    if (err) logger.error({ err, jobId }, "Subscriber falhou ao inscrever");
  });

  sub.on("message", (_ch, msg) => {
    try {
      const parsed = JSON.parse(msg) as SseEvent;
      onEvent(parsed);
    } catch (err) {
      logger.warn({ err, msg }, "Mensagem pub/sub inválida");
    }
  });

  return {
    close: async () => {
      try {
        await sub.unsubscribe(channel);
        sub.disconnect();
      } catch { /* ignore */ }
    },
  };
}
