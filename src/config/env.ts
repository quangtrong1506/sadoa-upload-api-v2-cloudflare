import { env as cloudflareEnv } from "cloudflare:workers";
import { z } from "zod";

/**
 * Zod schema describing the runtime configuration of the Worker.
 *
 * All values come from Cloudflare `vars` / secrets (exposed through the
 * `cloudflare:workers` `env` binding) and are validated at startup. Secrets
 * and bindings should never be read through `process.env` directly; this single
 * module is the only place that resolves the runtime configuration.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_NAME: z.string().min(1).default("get-image-api"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  API_PREFIX: z.string().min(1).default("/api"),
  CORS_ORIGIN: z.string().default("*"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

  // API key required by the image upload endpoint.
  X_API_KEY: z.string().min(1).default("dev_api_key"),
  // Telegram bot credentials used as the image store. Optional so the Worker
  // still boots when image features are not configured.
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

function resolveSource(): Record<string, unknown> {
  // `cloudflare:workers` env is a live proxy available in the Workers runtime.
  // In Node (tests) this module is aliased to a typed mock.
  return cloudflareEnv as unknown as Record<string, unknown>;
}

let cachedEnv: AppEnv | null = null;

/**
 * Returns the validated runtime environment.
 *
 * The result is cached after the first call. Zod `.default()` values guarantee
 * the Worker never crashes at startup when optional vars are absent.
 */
export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }
  cachedEnv = envSchema.parse(resolveSource());
  return cachedEnv;
}
