import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3002),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),

  REDIS_URL: z.string().url().default("redis://localhost:6379"),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  SEARXNG_URL: z.string().url().default("http://localhost:8080"),
  BRASILAPI_URL: z.string().url().default("https://brasilapi.com.br/api"),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),

  MAX_JOBS_PER_USER_PER_MIN: z.coerce.number().default(5),
  CACHE_TTL_HOURS: z.coerce.number().default(24),
  CONTENT_REFRESH_DAYS: z.coerce.number().default(30),
  SCRAPE_TIMEOUT_MS: z.coerce.number().default(15000),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Configuração inválida:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
