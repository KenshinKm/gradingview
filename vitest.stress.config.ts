import { defineConfig } from "vitest/config";
import path from "node:path";

// Stress tests hit the real AI model and cost real money. Run with `npm run stress`.
export default defineConfig({
  test: { environment: "node", include: ["stress/*.stress.ts"], testTimeout: 400_000, hookTimeout: 60_000 },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "stress/empty.ts"),
    },
  },
});
