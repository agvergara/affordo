import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Engine (.ts) tests stay in node; UI (.tsx) tests run in jsdom.
    environmentMatchGlobs: [["src/**/*.test.tsx", "jsdom"]],
  },
});
