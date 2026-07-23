import { expect, test } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const fixture = pathToFileURL(resolve("tests/browser/admin-shell.html")).href;

test("keeps desktop landmarks and mobile overflow inside their panels", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(fixture);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Users", level: 1 })).toHaveCount(1);

  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  expect(
    await page
      .locator(".admin-kit__table-wrap")
      .evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  await expect(page.getByRole("heading", { name: "Server logs", level: 2 })).toBeVisible();
  expect(
    await page
      .locator(".admin-kit__logs-output")
      .evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await expect(
    page.getByText(
      "automation-for-the-long-running-catalog-reconciliation-and-import-pipeline-production",
    ),
  ).toBeVisible();
});
