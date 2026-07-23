import { expect, test } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const fixture = pathToFileURL(resolve("tests/browser/admin-shell.html")).href;

test("keeps routed navigation intrinsic and collection overflow inside their panels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(fixture);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Users", level: 1 })).toHaveCount(1);
  await expect(page.locator(".admin-kit__keys-table-wrap")).toBeVisible();
  const rail = await page.locator(".admin-kit__portal-navigation").boundingBox();
  const content = await page.locator(".admin-kit__portal-content").boundingBox();
  expect(rail?.height).toBeLessThan(content?.height ?? 0);

  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(page.locator(".admin-kit__key-cards")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Server logs", level: 2 })).toBeVisible();
  expect(
    await page
      .locator(".admin-kit__logs-output")
      .evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await expect(
    page
      .getByLabel("API key cards")
      .getByText(
        "automation-for-the-long-running-catalog-reconciliation-and-import-pipeline-production",
      ),
  ).toBeVisible();
});
