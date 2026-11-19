import { expect, test, type Page } from "@playwright/test";
import { mount, serveDataTable } from "./data-table-harness";

const details = `[
  { label: "Created", value: "Jul 12, 2026, 5:00 PM" },
  { label: "Last used", value: "automation-for-the-long-running-catalog-reconciliation-and-import-pipeline" },
  { label: "Environment", value: "production" },
]`;

const usersWithDetails = mount(
  `React.createElement(Kit.UsersPanel, { adapter: usersAdapter, search: false })`,
  `const usersAdapter = {
    async list() {
      return { items: [{ id: "usr_1", label: "avery", role: { value: "owner", label: "Owner" }, status: { value: "active", label: "Active" }, details: ${details} }], total: 1, page: 1, pageSize: 25 };
    },
  };`,
);

const keysWithDetails = mount(
  `React.createElement(Kit.ApiKeysPanel, { adapter: keysAdapter, presentation: "responsive", storageKey: "keys" })`,
  `const keysAdapter = {
    async list() {
      return [{ id: "key_1", name: "automation", maskedKey: "ak_1234567890abcdef", scopes: ["catalog.read"], state: "active", createdAt: "2026-07-13T00:00:00.000Z", details: ${details} }];
    },
    async create() { throw new Error("unused"); },
    async revoke() { throw new Error("unused"); },
  };`,
);

const panels = [
  { name: "UsersPanel details", script: usersWithDetails, selector: ".admin-kit__user-details" },
  { name: "ApiKeysPanel details", script: keysWithDetails, selector: ".admin-kit__key-details" },
];

const widths = [
  { name: "phone 375", viewport: 375, container: undefined },
  { name: "narrow 280 column", viewport: 1280, container: 280 },
];

function splitWords(selector: string) {
  const splits: string[] = [];
  for (const dt of Array.from(document.querySelectorAll(`${selector} dt`))) {
    const walker = document.createTreeWalker(dt, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (const word of (node.textContent ?? "").matchAll(/\S+/g)) {
        const tops = new Set<number>();
        for (let i = word.index; i < word.index + word[0].length; i += 1) {
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          tops.add(Math.round(range.getBoundingClientRect().top));
        }
        if (tops.size > 1) splits.push(word[0]);
      }
    }
  }
  return splits;
}

const pageOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const panel of panels) {
  for (const width of widths) {
    for (const textZoom of [1, 2]) {
      test(`${panel.name} keeps labels on whole words at ${width.name}${textZoom === 2 ? " with 200% text" : ""}`, async ({ page }) => {
        await page.setViewportSize({ width: width.viewport, height: 812 });
        await serveDataTable(page, {
          script: panel.script,
          containerWidth: width.container,
          headStyle: textZoom === 2 ? "html { font-size: 200%; }" : "",
        });
        const labels = page.locator(`${panel.selector} dt`);
        await expect(labels.first()).toBeVisible();
        expect(await labels.allTextContents()).toContain("Created");
        expect(await page.evaluate(splitWords, panel.selector)).toEqual([]);
        if (width.container === undefined) expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
      });
    }
  }
}
