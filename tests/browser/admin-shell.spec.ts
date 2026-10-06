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

const dialogFixture = pathToFileURL(resolve("tests/browser/admin-dialog.html")).href;
const confirmationFixture = pathToFileURL(
  resolve("tests/browser/admin-confirmation-dialog.html"),
).href;

test("keeps a dialog taller than the viewport inside it, scrollable, with Close reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(dialogFixture);
  const dialog = page.getByRole("dialog", { name: "Invite teammates" });
  const close = page.getByRole("button", { name: "Close dialog" });
  expect(
    await dialog.evaluate((node) => node.scrollHeight > node.clientHeight),
    "the fixture dialog must be taller than the viewport for this test to mean anything",
  ).toBe(true);
  const box = await dialog.boundingBox();
  expect(box?.y).toBeGreaterThanOrEqual(0);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(844);
  await expect(close).toBeVisible();

  const last = dialog.locator(".admin-kit__dialog-actions button").last();
  await last.scrollIntoViewIfNeeded();
  const lastBox = await last.boundingBox();
  expect(lastBox?.y).toBeGreaterThanOrEqual(0);
  expect((lastBox?.y ?? 0) + (lastBox?.height ?? 0)).toBeLessThanOrEqual(844);

  // Scrolled to the bottom, the header (and Close) is still pinned inside the viewport.
  const closeBox = await close.boundingBox();
  expect(closeBox?.y).toBeGreaterThanOrEqual(0);
  expect((closeBox?.y ?? 0) + (closeBox?.height ?? 0)).toBeLessThanOrEqual(844);
  expect(await dialog.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
});

test("gives the dialog Close button a 44px target", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(dialogFixture);
  const box = await page.getByRole("button", { name: "Close dialog" }).boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
});

for (const [name, url, button] of [
  ["AdminDialog", dialogFixture, "Send invites"],
  ["AdminConfirmationDialog", confirmationFixture, "Revoke key"],
] as const) {
  test(`${name} picks up a host rebrand on .admin-kit.admin-kit--theme-core`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(url);
    const primary = page.getByRole("button", { name: button });
    expect(await primary.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
      "rgb(107, 91, 69)",
    );
    // The theme layer must not become a box that shifts the dialog or its backdrop.
    const layer = page.locator(".admin-kit--layer");
    await expect(layer).toHaveCount(1);
    expect(await layer.evaluate((node) => getComputedStyle(node).display)).toBe("contents");
  });
}

test("draws form control borders at 3:1 or better against the surface behind them", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(dialogFixture);
  const ratio = await page
    .locator(".admin-kit__dialog .admin-kit__field input")
    .first()
    .evaluate((node) => {
      const channels = (value: string) =>
        (value.match(/rgba?\(([^)]+)\)/)?.[1] ?? "")
          .split(/[ ,/]+/)
          .map(Number)
          .slice(0, 3);
      const luminance = (rgb: number[]) => {
        const [r, g, b] = rgb.map((channel) => {
          const c = channel / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const border = luminance(channels(getComputedStyle(node).borderTopColor));
      const surface = luminance(
        channels(getComputedStyle(node.closest(".admin-kit__dialog")!).backgroundColor),
      );
      const [lighter, darker] = [border, surface].sort((a, b) => b - a);
      return (lighter + 0.05) / (darker + 0.05);
    });
  expect(ratio).toBeGreaterThanOrEqual(3);
});

test("puts a skip link first in tab order and moves focus into the content region", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(fixture);
  const link = page.getByRole("link", { name: "Skip to content" });
  const hidden = await link.boundingBox();
  expect(hidden?.width, "the skip link is visually hidden until focused").toBeLessThanOrEqual(1);

  await page.keyboard.press("Tab");
  await expect(link).toBeFocused();
  const shown = await link.boundingBox();
  expect(shown?.width).toBeGreaterThan(40);
  expect(shown?.x).toBeGreaterThanOrEqual(0);
  expect(shown?.y).toBeGreaterThanOrEqual(0);
  expect(await link.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("solid");

  // The fixture is static markup (no React handlers), so this exercises the
  // native fragment-link fallback; the programmatic path is covered in jsdom.
  await page.keyboard.press("Enter");
  const active = await page.evaluate(() => ({
    className: document.activeElement?.className,
    outline: getComputedStyle(document.activeElement!).outlineStyle,
  }));
  expect(active.className).toContain("admin-kit__portal-content");
  expect(active.outline, "programmatic focus of the region draws no ring").toBe("none");
});

test("renders loading skeleton bars, and only animates them when motion is allowed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(fixture);
  const skeleton = page.locator(".skeleton-fixture");
  const bars = skeleton.locator(".admin-kit__skeleton-bar");
  await expect(bars).toHaveCount(3);
  expect((await bars.first().boundingBox())?.height).toBeGreaterThan(8);
  expect((await skeleton.getByText("Loading users…").boundingBox())?.width).toBeLessThanOrEqual(1);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await bars.first().evaluate((node) => getComputedStyle(node).animationName)).toBe(
    "admin-kit-skeleton-pulse",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await bars.first().evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
});

test("stacks the OperationalJobsPanel table into labelled cards on phones", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(fixture);
  const wrap = page.locator(".admin-kit__operations-table-wrap");
  expect(
    await wrap.evaluate((node) => node.scrollWidth <= node.clientWidth),
    "OperationalJobsPanel must not require horizontal scrolling at 375px",
  ).toBe(true);
  await expect(wrap.locator(".admin-kit__mobile-cell-label", { hasText: "Started" })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(wrap.locator(".admin-kit__mobile-cell-label").first()).toBeHidden();
});
