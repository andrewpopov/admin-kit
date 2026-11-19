import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./engine-test";
import { readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const fixtures = readdirSync("tests/browser").filter((file) => file.endsWith(".html"));
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const variants: Record<string, (page: Page) => Promise<void>> = {
  light: async () => undefined,
  dark: (page) => page.evaluate(() => document.documentElement.classList.add("dark")),
  rtl: (page) => page.evaluate(() => document.documentElement.setAttribute("dir", "rtl")),
  graphite: (page) => page.evaluate(() => document.body.classList.add("admin-kit--palette-graphite")),
  "graphite dark": (page) =>
    page.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.body.classList.add("admin-kit--palette-graphite");
    }),
};

// The kit paints no page background and fixtures hold unstyled host markup (bare links and
// buttons, and a rebranded light accent that ignores the dark-accent family), so the host
// page is dressed from the kit's own tokens before axe reads the colours.
const dressHostPage = async (page: Page) => {
  await page.addStyleTag({
    content: `
      *, ::before, ::after { transition: none !important; animation: none !important; }
      html.dark .admin-kit.admin-kit--theme-core { --admin-kit-accent: var(--admin-kit-dark-accent); }
      a:not([class]) { color: var(--admin-kit-accent); }
      button:not([class]) { background: var(--admin-kit-surface-subtle); color: var(--admin-kit-text); }
    `,
  });
  await page.evaluate(() => {
    const kit = document.querySelector(".admin-kit");
    if (kit) document.body.style.background = getComputedStyle(kit).getPropertyValue("--admin-kit-surface");
  });
};

for (const fixture of fixtures) {
  for (const [variant, apply] of Object.entries(variants)) {
    test(`${fixture} has no WCAG A/AA violations in ${variant}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(pathToFileURL(resolve("tests/browser", fixture)).href);
      await apply(page);
      await dressHostPage(page);
      const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze();
      expect(
        violations.flatMap(({ id, nodes }) =>
          nodes.map((node) => `${id}: ${node.target.join(" ")} ${node.any[0]?.message ?? node.failureSummary ?? ""}`),
        ),
      ).toEqual([]);
    });
  }
}
