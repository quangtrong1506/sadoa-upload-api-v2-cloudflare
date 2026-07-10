import { httpServerHandler } from "cloudflare:node";
import app from "./app";
import { logger } from "./utils/logger";

const PORT = 3000;

/**
 * Start the underlying Node.js HTTP server (Express app). On Cloudflare Workers
 * `listen()` does not bind a real socket — the port is used as a routing key so
 * `httpServerHandler` knows which server should handle each incoming request.
 *
 * IMPORTANT: this is intentionally the ONLY place that opens a "server". There
 * is no traditional Node HTTP server and no `app.listen()` outside this handler
 * context — the Worker itself receives requests via the `fetch` handler.
 */
app.listen(PORT);

export default httpServerHandler({ port: PORT });

logger.info(`Express ready on Cloudflare Workers (port ${PORT})`);
