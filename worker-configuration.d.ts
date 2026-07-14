/**
 * Type definitions for the Cloudflare Workers runtime.
 *
 * This file mirrors what `wrangler types` generates. It declares the
 * `cloudflare:workers`, `cloudflare:node` and `cloudflare:test` modules as well
 * as the per-request `req.cloudflare` augmentation so the project type-checks
 * without first running `wrangler types`.
 *
 * Run `pnpm cf-typegen` to regenerate this file when bindings in
 * `wrangler.jsonc` change.
 */

/// <reference types="@cloudflare/workers-types" />

interface Env {
  NODE_ENV?: string;
  APP_NAME?: string;
  LOG_LEVEL?: string;
  API_PREFIX?: string;
  CORS_ORIGIN?: string;
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW_MS?: string;
}

interface CloudflareRequestContext {
  cf: RequestInitCfProperties;
  ctx: ExecutionContext;
  env: Env;
}

declare module "node:http" {
  interface IncomingMessage {
    cloudflare?: CloudflareRequestContext;
  }
}

declare module "cloudflare:workers" {
  export const env: Env;
  export const ctx: ExecutionContext;
  export const caches: CacheStorage;
}

declare const caches: CacheStorage;

declare module "cloudflare:node" {
  import type { Server } from "node:http";
  import type { ExportedHandlerFetchHandler } from "@cloudflare/workers-types";

  export function httpServerHandler(
    server: Server,
    options?: { port?: number },
  ): ExportedHandlerFetchHandler;

  export function httpServerHandler(options: {
    port?: number;
  }): ExportedHandlerFetchHandler;

  export function handleAsNodeRequest(
    port: number,
    request: Request,
  ): Promise<Response>;
}

declare module "cloudflare:test" {
  export function env<T = unknown>(binding: string): T;
}
