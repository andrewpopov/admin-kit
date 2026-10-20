import { expect, test } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

test("release notes fit the supported phone sizes in light and dark", async ({
  page,
}, testInfo) => {
  for (const detail of [false, true]) {
    await page.goto(
      pathToFileURL(resolve(`tests/browser/${detail ? "release-note" : "release-notes"}.html`))
        .href,
    );
    for (const dark of [false, true]) {
      await page.evaluate(
        (value) => document.documentElement.classList.toggle("dark", value),
        dark,
      );
      for (const size of [
        { width: 375, height: 667 },
        { width: 320, height: 568 },
        { width: 667, height: 375 },
      ]) {
        await page.setViewportSize(size);
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        await expect(page.getByRole("heading", { name: "What's new", level: 1 })).toBeVisible();
        await expect(page.getByText("Jun October 20 update")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const link = page.getByRole("link", {
          name: detail ? "All updates" : "Full release notes",
        });
        expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
        await page.screenshot({
          path: testInfo.outputPath(
            `${detail ? "detail" : "list"}-${dark ? "dark" : "light"}-${size.width}x${size.height}.png`,
          ),
          animations: "disabled",
        });
      }
    }
  }
});
