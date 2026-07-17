import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // Without an explicit include, vitest's default glob walks `.worktree/`,
    // running the test suites of every stale branch checked out there.
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.worktree/**"],
    // jsdom environment startup takes ~10s/file on this machine, exceeding
    // vitest's 5s default testTimeout and failing the first test in every file.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
