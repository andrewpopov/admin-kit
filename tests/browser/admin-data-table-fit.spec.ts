import { expect, test } from "@playwright/test";
import { serveDataTable, sixColumnScript } from "./data-table-harness";

const script = sixColumnScript();

const overflow = () => {
  const wrap = document.querySelector<HTMLElement>(".admin-kit__data-table-wrap")!;
  return wrap.scrollWidth - wrap.clientWidth;
};

for (const containerWidth of [600, 900, 1200]) {
  test(`a six-column table fits a ${containerWidth}px container without sideways scroll`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await serveDataTable(page, { script, containerWidth });
    await expect(page.getByRole("table", { name: "Keys" })).toBeVisible();
    expect(await page.evaluate(overflow)).toBeLessThanOrEqual(0);
  });
}

for (const containerWidth of [320, 375]) {
  test(`a six-column table stacks into compact cards in a ${containerWidth}px container`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await serveDataTable(page, { script, containerWidth });
    await expect(page.locator(".admin-kit__data-table-wrap")).toHaveAttribute("data-stacked", "true");
    expect(await page.evaluate(overflow)).toBeLessThanOrEqual(0);
    await expect(page.getByRole("separator")).toHaveCount(0);
    const row = page.locator("tbody tr").first();
    await expect(row).toHaveCSS("display", "grid");
    const [card, title, badge] = await Promise.all([
      row.boundingBox(),
      row.locator('td[data-card-slot="title"]').boundingBox(),
      row.locator('td[data-card-slot="badge"]').boundingBox(),
    ]);
    expect(Math.abs(title!.y - badge!.y), "title and badge share a row").toBeLessThan(2);
    expect(card!.height, "a stacked record stays compact").toBeLessThan(260);
  });
}

test("hides tertiary, then secondary, columns as the container narrows", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, { script, containerWidth: 900 });
  const states = await page.evaluate(async () => {
    const root = document.querySelector<HTMLElement>("#root")!;
    const shown = (name: string) =>
      [...document.querySelectorAll("thead th")].some((th) => th.textContent?.trim() === name);
    const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const seen: Array<{ width: number; created: boolean; lastUsed: boolean; scope: boolean }> = [];
    for (let width = 900; width >= 600; width -= 1) {
      root.style.width = `${width}px`;
      await frame();
      seen.push({ width, created: shown("Created"), lastUsed: shown("Last used"), scope: shown("Scope") });
    }
    return seen;
  });
  expect(states.some((state) => !state.created && state.lastUsed), "Created hides while Last used still shows").toBe(true);
  expect(states.filter((state) => state.created && !state.lastUsed), "Last used never hides before Created").toEqual([]);
  expect(states.some((state) => !state.lastUsed && state.scope), "Last used hides while Scope still shows").toBe(true);
});

test("a fragment cell's second node starts right of its label when stacked", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, { script, containerWidth: 390 });
  await expect(page.locator(".admin-kit__data-table-wrap")).toHaveAttribute("data-stacked", "true");
  const scope = page.locator("tbody tr").first().locator("td").nth(1);
  const label = (await scope.locator(".admin-kit__mobile-cell-label").boundingBox())!;
  const second = (await scope.locator("small").boundingBox())!;
  expect(second.x).toBeGreaterThanOrEqual(label.x + label.width);
  expect(await page.evaluate(overflow)).toBeLessThanOrEqual(0);
});

test("a viewer-resized width wider than the container scrolls with a sticky first column", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() =>
    localStorage.setItem("admin-kit:table-widths:keys", JSON.stringify({ scope: 900 })),
  );
  await serveDataTable(page, { script, containerWidth: 900 });
  const wrap = page.locator(".admin-kit__data-table-wrap");
  await expect(wrap).toHaveAttribute("data-scrolls", "true");
  expect(await page.evaluate(overflow)).toBeGreaterThan(0);
  const firstCell = page.locator("tbody tr").first().locator("td").first();
  expect(await firstCell.evaluate((cell) => getComputedStyle(cell).position)).toBe("sticky");
});
