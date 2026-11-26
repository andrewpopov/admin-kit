import { defineConfig } from "@playwright/test";

const crossEngineSpecs = /(admin-layout|admin-panel-band|admin-shell|a11y|text-resilience)\.spec\.ts$/;

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  workers: Number(process.env.LANE_BROKER_CPU_CORES || 2),
  use: { headless: true },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
    { name: "webkit", testMatch: crossEngineSpecs, use: { browserName: "webkit" } },
    ...(process.env.ADMIN_KIT_FIREFOX
      ? [{ name: "firefox", testMatch: crossEngineSpecs, use: { browserName: "firefox" as const } }]
      : []),
  ],
});
