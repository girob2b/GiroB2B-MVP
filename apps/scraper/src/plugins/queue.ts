import { Queue, QueueEvents } from "bullmq";
import { redis } from "./redis.js";

export const SEARCH_QUEUE_NAME = "search-web";

export const searchQueue = new Queue(SEARCH_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail:     { age: 86400, count: 200 },
  },
});

export const searchQueueEvents = new QueueEvents(SEARCH_QUEUE_NAME, {
  connection: redis,
});
