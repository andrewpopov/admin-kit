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

test("keeps the phone app header compact so content starts near the top", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(fixture);
  await expect(page.getByRole("heading", { name: "Admin console", level: 1 })).toBeVisible();
  expect((await page.getByRole("button", { name: "Menu" }).boundingBox())?.height).toBeGreaterThanOrEqual(44);
  const content = await page.locator(".admin-kit__portal-content").boundingBox();
  expect(
    content?.y,
    "the frame header and Menu toggle must not push content below 140px on a phone",
  ).toBeLessThanOrEqual(140);

  await page.setViewportSize({ width: 1280, height: 800 });
  const fontSize = await page
    .getByRole("heading", { name: "Admin console", level: 1 })
    .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
  expect(fontSize, "desktop frame title keeps its larger size").toBeGreaterThanOrEqual(28);
});

test("styles only column headers as uppercase headers, not row headers", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(fixture);
  const wrap = page.getByTestId("stack-table-wrap");
  const rowHeader = wrap.locator("tbody th[scope=row]");
  await expect(rowHeader).toHaveCount(1);
  const rowStyle = await rowHeader.evaluate((node) => {
    const style = getComputedStyle(node);
    return { textTransform: style.textTransform, fontWeight: style.fontWeight };
  });
  expect(rowStyle.textTransform, "row headers read as body text").toBe("none");
  expect(Number(rowStyle.fontWeight)).toBe(600);
  expect(
    await wrap.locator("thead th").first().evaluate((node) => getComputedStyle(node).textTransform),
    "column headers keep the uppercase header look",
  ).toBe("uppercase");
});

test("keeps a disabled primary button readable (text contrast at least 4.5:1)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(fixture);
  const button = page.getByRole("button", { name: "Archive all" });
  await expect(button).toBeDisabled();
  const contrast = await button.evaluate((node) => {
    type Rgb = [number, number, number];
    const parse = (value: string): Rgb => {
      const channels = value.match(/rgba?\(([^)]+)\)/)?.[1].split(/[ ,/]+/).map(Number);
      if (!channels) throw new Error(`unparseable colour: ${value}`);
      return [channels[0], channels[1], channels[2]];
    };
    const blend = (top: Rgb, below: Rgb, alpha: number): Rgb =>
      [0, 1, 2].map((i) => top[i] * alpha + below[i] * (1 - alpha)) as Rgb;
    let behind: Rgb = [255, 255, 255];
    for (let el = node.parentElement; el; el = el.parentElement) {
      const background = getComputedStyle(el).backgroundColor;
      if (!/rgba\(.*, 0\)$/.test(background) && background !== "transparent") {
        behind = parse(background);
        break;
      }
    }
    const style = getComputedStyle(node);
    // Opacity dims text and background together over whatever is behind the button.
    const opacity = Number(style.opacity);
    const background = blend(parse(style.backgroundColor), behind, opacity);
    const text = blend(parse(style.color), behind, opacity);
    const luminance = (rgb: Rgb) => {
      const [r, g, b] = rgb.map((channel) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [lighter, darker] = [luminance(text), luminance(background)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});
