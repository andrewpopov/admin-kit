import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const styles = readFileSync(resolve("src/styles.css"), "utf8");

const tableMarkup = (modifier: string) => `
  <section class="admin-kit admin-kit--theme-core" data-admin-kit-theme="core">
    <div class="admin-kit__table-wrap admin-kit__table-wrap--${modifier}">
      <table class="admin-kit__table admin-kit__table--${modifier}">
        <thead><tr><th scope="col">Name</th><th scope="col">Value</th></tr></thead>
        <tbody>
          <tr><th scope="row">alpha</th><td>one</td></tr>
          <tr><th scope="row">omega</th><td>two</td></tr>
        </tbody>
      </table>
    </div>
  </section>`;

async function load(page: import("@playwright/test").Page, body: string) {
  await page.setContent(`<style>${styles}</style>${body}`);
}

test("row-header th in the last body row draws no bottom border", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await load(page, tableMarkup("stack"));
  const border = (selector: string) =>
    page.locator(selector).evaluate((node) => getComputedStyle(node).borderBottomWidth);
  expect(await border("tbody tr:last-child th")).toBe("0px");
  expect(await border("tbody tr:last-child td")).toBe("0px");
  expect(await border("tbody tr:first-child th")).toBe("1px");
});

test("stacked cards keep the divider under the last row's header", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await load(page, tableMarkup("stack"));
  expect(
    await page
      .locator("tbody tr:last-child th")
      .evaluate((node) => getComputedStyle(node).borderBottomWidth),
  ).toBe("1px");
});

test("--stack-narrow stays a table at 667px landscape and stacks at 375px", async ({ page }) => {
  await load(page, tableMarkup("stack-narrow"));
  await page.setViewportSize({ width: 667, height: 375 });
  expect(await page.locator("table").evaluate((n) => getComputedStyle(n).display)).toBe("table");
  await page.setViewportSize({ width: 375, height: 667 });
  expect(await page.locator("table").evaluate((n) => getComputedStyle(n).display)).toBe("block");
});

test("the default --stack still stacks at 667px", async ({ page }) => {
  await load(page, tableMarkup("stack"));
  await page.setViewportSize({ width: 667, height: 375 });
  expect(await page.locator("table").evaluate((n) => getComputedStyle(n).display)).toBe("block");
});

test("a wide nowrap child does not widen a stack or panel header", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const tabs = `<div class="tabs" style="white-space:nowrap"><span style="display:inline-block;width:900px">tabs</span></div>`;
  await load(
    page,
    `<div class="admin-kit"><div class="admin-kit__stack admin-kit__stack--md">${tabs}</div>
     <header class="admin-kit__panel-header">${tabs}</header></div>`,
  );
  const widths = await page
    .locator(".tabs")
    .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().width));
  for (const width of widths)
    expect(width, "nowrap tab strip must not stretch its grid column").toBeLessThanOrEqual(375);
});
