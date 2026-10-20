import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const localChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  workers: Number(process.env.LANE_BROKER_CPU_CORES || 2),
  use: {
    browserName: "chromium",
    headless: true,
    launchOptions: existsSync(localChrome) ? { executablePath: localChrome } : undefined,
  },
});
