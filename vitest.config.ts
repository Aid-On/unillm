import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/types.ts"],
    },
    onConsoleLog(log, type) {
      // Suppress promise rejection warnings during tests
      if (log.includes('PromiseRejectionHandledWarning')) {
        return false;
      }
    },
  },
});
