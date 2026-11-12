import { expect, test } from "@playwright/test";
import { serveDataTable } from "./data-table-harness";

const script = `
const rows = [
  { id: "a", name: "Deployment alpha", scope: "cairn.read", state: "active", created: "Jul 10", used: "Jul 11", note: "Best effort" },
  { id: "b", name: "Deployment beta", scope: "cairn.write", state: "revoked", created: "Jul 12", used: "never", note: "Writes tickets" },
];
const columns = [
  { id: "name", header: "Name", minWidth: 160, cardSlot: "title", cell: (row) => row.name },
  {
    id: "scope",
    header: "Scope",
    defaultWidth: 200,
    minWidth: 120,
    cell: (row) => React.createElement(React.Fragment, null,
      React.createElement("strong", null, row.scope),
      React.createElement("small", null, row.note)),
  },
  { id: "state", header: "State", defaultWidth: 90, minWidth: 80, cardSlot: "badge", cell: (row) => row.state },
  { id: "created", header: "Created", defaultWidth: 140, minWidth: 100, priority: "tertiary", cardSlot: "meta", cell: (row) => row.created },
  { id: "used", header: "Last used", defaultWidth: 140, minWidth: 100, priority: "secondary", cardSlot: "meta", cell: (row) => row.used },
  { id: "actions", header: "Actions", defaultWidth: 160, minWidth: 160, cardSlot: "actions", cell: () => React.createElement("button", { type: "button" }, "Revoke") },
];
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(AdminDataTable, { columns, rows, rowKey: (row) => row.id, label: "Keys", storageKey: "keys" }),
);
`;

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
    expect(
      await page.evaluate(() => document.querySelector(".admin-kit__data-table-wrap")?.hasAttribute("data-stacked")),
    ).toBe(false);
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
  await serveDataTable(page, { script, containerWidth: 640 });
  await expect(page.getByRole("columnheader", { name: "Created" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Last used" })).toHaveCount(1);
  await page.locator("#root").evaluate((root) => (root.style.width = "560px"));
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
