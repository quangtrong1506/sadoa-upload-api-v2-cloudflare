/**
 * Mock of the `cloudflare:workers` module used during Vitest runs in Node.
 *
 * This file is intentionally excluded from `tsconfig` (it is not part of the
 * Worker bundle) and only executed through esbuild inside Vitest. It mirrors
 * the runtime `env` shape so `getEnv()` works under test.
 */
export const env = {
  NODE_ENV: "test",
  APP_NAME: "sadoa-upload-api-v2-cloudflare-test",
  LOG_LEVEL: "silent",
  API_PREFIX: "/api",
  CORS_ORIGIN: "*",
  RATE_LIMIT_MAX: "1000",
  RATE_LIMIT_WINDOW_MS: "60000",
  TELEGRAM_BOT_TOKEN: "test_bot_token",
  TELEGRAM_CHAT_ID: "123456789",
};

export const ctx = {
  waitUntil: (_promise: Promise<unknown>): void => {
    /* no-op in tests */
  },
  passThroughOnException: (): void => {
    /* no-op in tests */
  },
};

export const caches = undefined as unknown as CacheStorage;
