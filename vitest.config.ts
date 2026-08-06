import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // e2e specs are Playwright's — keep them out of vitest.
    exclude: ["e2e/**", "node_modules/**", "dist/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      // Pure-logic modules with unit tests — DB/SDK-bound adapters (supabase,
      // resend, email rendering) are covered by e2e + the webhook integration
      // tests instead.
      include: [
        "lib/decline-codes.ts",
        "lib/dunning-helpers.ts",
        "lib/scheduler.ts",
        "lib/stats.ts",
        "lib/subjects.ts",
        "lib/rate-limit.ts",
        "lib/tokens.ts",
        "lib/template-store.ts",
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        statements: 75,
      },
    },
  },
});
