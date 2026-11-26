import { expect, test } from "./engine-test";
import { serveDataTable } from "./data-table-harness";
import { chipsBand } from "./panel-band-fixtures";

// WebKit reports a 44px target as 43.99997 after fractional layout.
const LAYOUT_EPSILON = 0.01;

test.use({ coarsePointer: true });

test("filter chip remove target is at least 44px tall and wide on a coarse pointer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await serveDataTable(page, { script: chipsBand });
  expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
  const boxes = await page
    .locator(".admin-kit__filter-chip button")
    .evaluateAll((buttons) => buttons.map((node) => node.getBoundingClientRect().toJSON()));
  expect(boxes).toHaveLength(4);
  for (const box of boxes) {
    expect(box.height).toBeGreaterThanOrEqual(44 - LAYOUT_EPSILON);
    expect(box.width).toBeGreaterThanOrEqual(44 - LAYOUT_EPSILON);
  }
});
