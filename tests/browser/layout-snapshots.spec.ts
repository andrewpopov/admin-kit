import { createServer, type Server } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

const browserDir = resolve("tests/browser");
const layoutDir = resolve(browserDir, "__layout__");
const update = process.env.UPDATE_LAYOUT === "1";
const tolerancePx = 2;

const fixtures = readdirSync(browserDir)
  .filter((file) => file.endsWith(".html") && file !== "gallery.html")
  .sort();
const viewports = [
  { name: "1280x800", width: 1280, height: 800 },
  { name: "375x812", width: 375, height: 812 },
];
const directions = ["ltr", "rtl"] as const;

const numericProps = ["left", "top", "width", "height"] as const;
const styleProps = ["display", "justify-content", "align-items", "text-align", "font-weight"] as const;

type Snapshot = Record<string, Record<string, number | string>>;
type BaselineFile = Record<string, Snapshot>;

// Elements whose geometry depends on live data, skipped with the reason. None of the
// current fixtures render any: their markup is static and their timestamps are fixed
// ISO strings, which timezoneId/locale below pin.
const skipped: { selector: string; reason: string }[] = [];

const freezeMotion = `*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }`;

function collect(skipSelectors: string[]) {
  const counts = new Map<string, number>();
  const snapshot: Record<string, Record<string, number | string>> = {};
  const props = ["display", "justify-content", "align-items", "text-align", "font-weight"];
  for (const element of Array.from(document.querySelectorAll("[class*='admin-kit__']"))) {
    if (skipSelectors.some((selector) => element.matches(selector))) continue;
    const className = Array.from(element.classList).find((name) => name.startsWith("admin-kit__"));
    if (!className) continue;
    const index = (counts.get(className) ?? 0) + 1;
    counts.set(className, index);
    const parent = element instanceof HTMLElement ? element.offsetParent : null;
    const rect = element.getBoundingClientRect();
    const origin = parent
      ? {
          left: parent.getBoundingClientRect().left + parent.clientLeft - parent.scrollLeft,
          top: parent.getBoundingClientRect().top + parent.clientTop - parent.scrollTop,
        }
      : { left: -window.scrollX, top: -window.scrollY };
    const computed = getComputedStyle(element);
    snapshot[`${className}:nth-of-type(${index})`] = {
      left: Math.round(rect.left - origin.left),
      top: Math.round(rect.top - origin.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      ...Object.fromEntries(props.map((name) => [name, computed.getPropertyValue(name)])),
    };
  }
  return snapshot;
}

function diffSnapshots(expected: Snapshot, actual: Snapshot): string[] {
  const diffs: string[] = [];
  for (const path of Object.keys(expected)) {
    const now = actual[path];
    if (!now) {
      diffs.push(`${path}: element missing (expected it in the fixture)`);
      continue;
    }
    for (const prop of numericProps) {
      const want = expected[path][prop] as number;
      const got = now[prop] as number;
      if (Math.abs(want - got) > tolerancePx) diffs.push(`${path}: ${prop} expected ${want}px, actual ${got}px`);
    }
    for (const prop of styleProps) {
      if (expected[path][prop] !== now[prop]) {
        diffs.push(`${path}: ${prop} expected "${expected[path][prop]}", actual "${now[prop]}"`);
      }
    }
  }
  for (const path of Object.keys(actual)) {
    if (!expected[path]) diffs.push(`${path}: element not in the baseline`);
  }
  return diffs;
}

test.use({ locale: "en-US", timezoneId: "UTC", colorScheme: "light", reducedMotion: "reduce" });

test("every fixture is covered", () => {
  expect(fixtures.length).toBeGreaterThan(0);
});

for (const fixture of fixtures) {
  for (const viewport of viewports) {
    for (const dir of directions) {
      const label = `${fixture} ${viewport.name} ${dir}`;
      test(`layout geometry: ${label}`, async ({ page, browserName }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(pathToFileURL(resolve(browserDir, fixture)).href);
        await page.addStyleTag({ content: freezeMotion });
        await page.evaluate((direction) => {
          document.documentElement.dir = direction;
        }, dir);
        await page.evaluate(() => document.fonts.ready);
        const actual = (await page.evaluate(collect, skipped.map((entry) => entry.selector))) as Snapshot;

        const file = resolve(layoutDir, `${fixture.replace(/\.html$/, "")}.${viewport.name}.${dir}.json`);
        const stored: BaselineFile = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
        if (update) {
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, `${JSON.stringify({ ...stored, [browserName]: actual }, null, 1)}\n`);
          return;
        }
        const expected = stored[browserName];
        expect(
          expected,
          `no ${browserName} baseline in ${file}; run with UPDATE_LAYOUT=1 to create it`,
        ).toBeDefined();
        const diffs = diffSnapshots(expected, actual);
        expect(diffs.join("\n"), `${label} drifted from ${file}`).toBe("");
      });
    }
  }
}

test.describe("fixture gallery", () => {
  let server: Server;
  let origin = "";

  test.beforeAll(async () => {
    server = createServer((request, response) => {
      const name = decodeURIComponent((request.url ?? "/").split("?")[0]).replace(/^\/+/, "");
      const target = resolve(browserDir, "..", "..", name || "tests/browser/gallery.html");
      if (!target.startsWith(resolve(browserDir, "..", "..")) || !existsSync(target)) {
        response.writeHead(404).end();
        return;
      }
      const type = target.endsWith(".css") ? "text/css" : "text/html";
      response.writeHead(200, { "content-type": type }).end(readFileSync(target));
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const address = server.address();
    origin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  });
  test.afterAll(() => server.close());

  test("lists every fixture and applies its toggles to each frame", async ({ page }) => {
    await page.goto(`${origin}/tests/browser/gallery.html`);
    const frames = page.locator("iframe[data-fixture]");
    await expect(frames).toHaveCount(fixtures.length);
    expect(await frames.evaluateAll((all) => all.map((frame) => frame.getAttribute("data-fixture")).sort())).toEqual(
      fixtures,
    );

    await page.getByLabel("Theme").selectOption("dark");
    await page.getByLabel("Palette").selectOption("graphite");
    await page.getByLabel("Direction").selectOption("rtl");
    const frame = page.frameLocator("iframe[data-fixture='admin-controls.html']");
    await expect(frame.locator("html")).toHaveClass(/dark/);
    await expect(frame.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(frame.locator(".admin-kit").first()).toHaveClass(/admin-kit--palette-graphite/);
  });
});
