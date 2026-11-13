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
  await serveDataTable(page, { script, containerWidth: 735 });
  await expect(page.getByRole("columnheader", { name: "Created" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Last used" })).toHaveCount(1);
  await page.locator("#root").evaluate((root) => (root.style.width = "650px"));
  await expect(page.getByRole("columnheader", { name: "Last used" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Scope" })).toHaveCount(1);
});

test("a fragment cell's second node starts right of its label when stacked", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, { script, containerWidth: 320 });
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
