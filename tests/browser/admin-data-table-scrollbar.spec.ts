import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { serveDataTable, sixColumnScript } from "./data-table-harness";

const localChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

test.use({
  launchOptions: {
    executablePath: existsSync(localChrome) ? localChrome : undefined,
    ignoreDefaultArgs: ["--hide-scrollbars"],
  },
});

test("a real vertical scrollbar does not make the table flip between table and cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  // The primary columns plus the details toggle need 616px; 621px is 5px over that until a 15px scrollbar takes its share.
  await serveDataTable(page, {
    script: sixColumnScript(60),
    containerWidth: 623,
    headStyle: "::-webkit-scrollbar { width: 15px; height: 15px; }",
  });
  const wrap = page.locator(".admin-kit__data-table-wrap");
  await expect(wrap).toBeVisible();
  await page.waitForTimeout(300);
  const flips = await wrap.evaluate(
    (node) =>
      new Promise<number>((done) => {
        let count = 0;
        new MutationObserver((records) => {
          count += records.length;
        }).observe(node, { attributeFilter: ["data-stacked"] });
        setTimeout(() => done(count), 1000);
      }),
  );
  expect(flips).toBe(0);
});
