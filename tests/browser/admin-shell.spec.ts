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
  const usersPanel = page.getByRole("region", { name: "Users" });
  const usersTableWrap = usersPanel.locator(".admin-kit__users-table-wrap");
  const resetPassword = usersPanel.getByRole("button", {
    name: "Reset password for avery.long.email.address@example.test",
  });
  await expect(resetPassword).toBeVisible();
  expect(
    await usersTableWrap.evaluate((node) => node.scrollWidth <= node.clientWidth),
    "UsersPanel actions must not require horizontal scrolling at 320px",
  ).toBe(true);
  const [usersBounds, resetBounds] = await Promise.all([
    usersTableWrap.boundingBox(),
    resetPassword.boundingBox(),
  ]);
  expect(resetBounds?.x).toBeGreaterThanOrEqual(usersBounds?.x ?? 0);
  expect((resetBounds?.x ?? 0) + (resetBounds?.width ?? 0)).toBeLessThanOrEqual(
    (usersBounds?.x ?? 0) + (usersBounds?.width ?? 0),
  );
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

test("collapses portal navigation behind a Menu toggle on phones only", async ({ page }) => {
  await page.goto(fixture);
  const toggle = page.getByRole("button", { name: "Menu" });
  const navigation = page.locator(".admin-kit__portal-navigation");

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(navigation).toBeHidden();
  expect((await toggle.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  const content = await page.locator(".admin-kit__portal-content").boundingBox();
  expect(content?.y).toBeLessThan(200);

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(toggle).toBeHidden();
  await expect(navigation).toBeVisible();
});

test("renders EventsPanel rows as labelled cards on phones", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(fixture);
  const eventsPanel = page.getByRole("region", { name: "Events" }).first();
  const eventsTableWrap = eventsPanel.locator(".admin-kit__events-table-wrap");
  await expect(eventsPanel.locator(".admin-kit__events-table tbody tr")).toHaveCount(1);
  expect(
    await eventsTableWrap.evaluate((node) => node.scrollWidth <= node.clientWidth),
    "EventsPanel must not require horizontal scrolling at 375px",
  ).toBe(true);
  await expect(
    eventsPanel.locator(".admin-kit__mobile-cell-label", { hasText: "Outcome" }),
  ).toBeVisible();
});

test("stacks a consumer-built table with the stack modifier on phones", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(fixture);
  const wrap = page.getByTestId("stack-table-wrap");
  expect(
    await wrap.evaluate((node) => node.scrollWidth <= node.clientWidth),
    "a .admin-kit__table--stack table must not require horizontal scrolling at 375px",
  ).toBe(true);
  await expect(wrap.locator(".admin-kit__mobile-cell-label", { hasText: "Cuisine" })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(wrap.locator(".admin-kit__mobile-cell-label").first()).toBeHidden();
});

test("fits a 15-item portal navigation without clipping at desktop size", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(fixture);
  const navigation = page.locator(".admin-kit__portal-navigation");
  await expect(navigation.locator(".admin-kit__portal-link")).toHaveCount(15);
  expect(
    await navigation.evaluate((node) => node.scrollHeight <= node.clientHeight),
    "desktop portal navigation must not need its own scrollbar for 15 items",
  ).toBe(true);
});
