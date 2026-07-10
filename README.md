# get-image-api

A production-ready **Express.js + TypeScript** backend designed to run on
**Cloudflare Workers** (no traditional Node server). It follows the structure
and conventions of [`edwinhern/express-typescript`](https://github.com/edwinhern/express-typescript)
adapted for the serverless Workers runtime.

## Tech stack

| Concern            | Choice                                  |
| ------------------ | --------------------------------------- |
| Language           | TypeScript (strict)                     |
| HTTP framework     | Express.js                              |
| Runtime            | Cloudflare Workers + Wrangler           |
| Config validation  | Zod                                     |
| Security           | Helmet, CORS                            |
| Logging            | Pino (structured JSON)                  |
| Request validation | Zod                                      |
| Lint / format      | ESLint (flat) + Prettier                |
| Tests              | Vitest + Supertest                      |
| Package manager    | pnpm                                    |

## Quick start

```bash
pnpm install
pnpm dev          # wrangler dev -> http://localhost:8787
pnpm test         # vitest run
pnpm build        # tsc --noEmit (typecheck)
pnpm deploy       # wrangler deploy
```

The health endpoint is available at `GET /api/health`.

## How Express runs on Cloudflare Workers

### The `httpServerHandler` bridge

Cloudflare Workers receive requests through a single `fetch(request)` handler —
there is no long-lived process and no OS-level socket you bind to. Express,
however, is built around a Node.js `http.Server`. The
[`cloudflare:node`](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/)
module bridges the two worlds:

```ts
// src/index.ts
import { httpServerHandler } from "cloudflare:node";
import app from "./app";

const PORT = 3000;
app.listen(PORT);                       // registers the server under port 3000
export default httpServerHandler({ port: PORT });
```

`httpServerHandler({ port })` returns a `fetch` handler. When a request arrives
on the Worker, it is converted into a Node.js `IncomingMessage`/`ServerResponse`
pair and routed to the Express server that called `listen(PORT)`. The `port`
here is a **routing key**, not an actual network port — multiple servers can
coexist in one Worker by using different ports.

### Why `nodejs_compat` is required

Express and its dependencies rely on Node.js built-ins (`http`, `stream`,
`events`, `crypto`, …). The `nodejs_compat` compatibility flag enables these
Node.js APIs (and polyfills) inside the Workers runtime, which is what lets a
framework written for classic Node servers execute on Cloudflare's V8 isolates.
It is enabled in `wrangler.jsonc`:

```jsonc
{
  "compatibility_flags": ["nodejs_compat"],
  "compatibility_date": "2026-07-10"
}
```

### Difference from Express on a VPS

| Aspect                | Express on a VPS                        | Express on Cloudflare Workers                  |
| --------------------- | --------------------------------------- | ---------------------------------------------- |
| Process model         | Long-running process                    | Short-lived isolates, scaled to zero           |
| Listening             | `app.listen(port)` binds a real socket  | `listen(port)` is a routing key for the handler |
| Inbound requests      | OS/load balancer → socket               | `fetch(request)` handler                       |
| Filesystem            | Available                               | Not available (no `fs`/local `path`)            |
| Config & secrets      | `process.env`                           | Cloudflare `vars` / bindings / secrets          |
| Global state          | Process-wide                            | Per-isolate (use bindings for shared state)     |
| Cold starts           | N/A                                     | Possible — keep startup cheap                   |

Because of this, the project deliberately:

- never reads `process.env` directly (config flows through `src/config/env.ts`
  which validates the Cloudflare `env` binding with Zod);
- never uses `fs` or reads local files;
- never opens its own HTTP server — `index.ts` is the only place that calls
  `app.listen()` and it returns the Worker `fetch` handler.

## Project structure

```
src
├── index.ts            # Cloudflare entry: wraps Express app via httpServerHandler
├── app.ts              # Express setup: middleware, routes, error handling
├── config
│   └── env.ts          # Zod-validated runtime config (no process.env)
├── api
│   ├── routes/         # Express routers (health, example, ...)
│   ├── controllers/    # Request handlers
│   ├── middleware/      # cors, helmet, json, logger, rate-limit, error, 404
│   ├── schemas/        # Zod request schemas
│   └── responses/      # Typed API response envelope
├── services/           # Business logic / data access
├── utils/              # logger, AppError
├── types/              # Shared TS types & augmentations
└── test/               # Vitest specs (supertest against the Express app)
```

## Configuration

Runtime configuration is declared and validated in `src/config/env.ts`. Values
come from `wrangler.jsonc` → `vars` (or `wrangler secret put` for secrets) and
are exposed through the `cloudflare:workers` `env` binding. Run `pnpm cf-typegen`
after changing bindings so `worker-configuration.d.ts` stays in sync.

## API response format

 Every response uses a consistent envelope:

```jsonc
{
  "success": boolean,
  "message": "optional human-readable message",
  "data": "optional payload",
  "errors": "optional validation / error details"
}
```

## Image API

Images are stored in a Telegram chat (used as a free object store) and served
back through the Worker. Two endpoints are mounted under `/api/images`:

| Method | Path                   | Auth            | Description                                              |
| ------ | ---------------------- | --------------- | -------------------------------------------------------- |
| POST   | `/api/images/upload`   | `x-api-key`     | Multipart `image` upload (max 10 MB, image MIME only).   |
| GET    | `/api/images/:id`      | public          | Streams the stored image bytes with long cache headers.  |

Example:

```bash
# Upload (requires x-api-key)
curl -X POST http://localhost:8787/api/images/upload \
  -H "x-api-key: $X_API_KEY" \
  -F "image=@./photo.png"

# Retrieve
curl http://localhost:8787/api/images/<file_id>
```

Configuration (in `wrangler.jsonc` `vars` / secrets):

- `X_API_KEY` — required by the upload endpoint (send as `x-api-key` header).
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — bot used as the image store.

The Telegram client (`src/services/telegram.service.ts`) uses the native
`fetch` API with the Web `FormData`/`Blob` types instead of `axios` +
`form-data`, keeping it free of Node-only stream dependencies so it runs
unchanged on the Workers runtime.

## Error handling

`src/utils/app-error.ts` defines `AppError` (with `statusCode`, `message`,
`details`). Route logic throws `AppError`s; the global error handler
(`src/api/middleware/error-handler.ts`) maps them to structured responses and
treats anything else as a 500 without leaking stack traces. Request bodies are
validated with Zod via `validateBody` before reaching controllers, so invalid
input returns `422` instead of crashing.

## Testing

`pnpm test` runs Vitest. Tests import the Express `app` directly and drive it
with Supertest — no Cloudflare runtime required. The `cloudflare:workers` import
is aliased to a typed mock in `vitest.config.ts` so the app can be imported in
Node.

## Deployment

```bash
pnpm deploy
```

Wrangler bundles `src/index.ts`, uploads it to Cloudflare, and the Worker starts
serving traffic through the `httpServerHandler` bridge.

## Troubleshooting: `require_streams(...) is not a function`

If the Worker fails to start with `Uncaught TypeError: require_streams(...) is
not a function` originating from `iconv-lite`, this is a known Cloudflare
workerd regression (workers-sdk issues [#9309](https://github.com/cloudflare/workers-sdk/issues/9309)
/ [#10022](https://github.com/cloudflare/workers-sdk/issues/10022)). Express's
body parser pulls in `raw-body` → `iconv-lite@0.4.x`, whose `streams.js` /
`extend-node.js` call `require('stream')`. workerd rewrites that to the broken
`require_streams` shim and the runtime crashes at startup (before any request).

The project pins a newer `iconv-lite` via a pnpm override in `package.json`
(`"pnpm": { "overrides": { "iconv-lite": "^0.6.3" } }`). `iconv-lite@0.6.x`
only touches `node:stream` lazily, so startup succeeds. If you remove the
override, the crash returns.

