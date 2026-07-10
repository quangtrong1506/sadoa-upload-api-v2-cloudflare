import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const cloudflareWorkersMock = fileURLToPath(
  new URL("./src/test/mocks/cloudflare-workers.ts", import.meta.url),
);

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/test/**", "src/index.ts"],
    },
  },
  resolve: {
    alias: {
      // `cloudflare:workers` is only available inside the Workers runtime.
      // In Node (Vitest) we provide a typed mock so the Express `app` can be
      // imported and exercised directly without the runtime global.
      "cloudflare:workers": cloudflareWorkersMock,
    },
  },
});
