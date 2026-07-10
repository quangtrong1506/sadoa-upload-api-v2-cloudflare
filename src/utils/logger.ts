import pino, { type Logger } from "pino";
import { getEnv } from "../config/env";

const env = getEnv();

const isDev = env.NODE_ENV === "development";

// `pino-pretty` runs as a worker thread, which is not available in the
// Cloudflare Workers runtime. Only enable the pretty transport when running in
// plain Node (never on a deployed Worker) so `pnpm deploy` stays safe.
const isWorkerRuntime = typeof (globalThis as { cloudflare?: unknown }).cloudflare !== "undefined";
const usePrettyTransport = isDev && !isWorkerRuntime;

/**
 * Application-wide structured logger backed by Pino.
 *
 * In local development (plain Node) the output is pretty-printed for
 * readability. On the Cloudflare Workers runtime it always emits compact JSON,
 * which is the recommended format for logpush / observability.
 */
export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  ...(usePrettyTransport
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

export default logger;
