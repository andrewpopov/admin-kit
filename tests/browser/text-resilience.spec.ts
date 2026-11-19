import type { Page } from "@playwright/test";
import { expect, test } from "./engine-test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { eventsPanel, mount, serveDataTable, sixColumnScript, usersPanel } from "./data-table-harness";

const fileFixture = (name: string) => pathToFileURL(resolve("tests/browser", name)).href;

const eventsAdapter = `const eventsAdapter = {
  severities: [{ value: "info", label: "Information" }, { value: "error", label: "Error (5xx)" }],
  outcomes: [{ value: "success", label: "Success" }, { value: "failure", label: "Failure" }],
  async list() {
    return { items: [{ id: "evt_1", occurredAt: "2026-11-13T11:17:00.000Z", category: "request", action: "POST", message: "POST /api/projects/CAIRN/tickets returned 502", severity: "error", outcome: "failure", actor: { label: "andrew.popov@example.test" }, resource: { label: "/api/projects/CAIRN/tickets" } }], page: 1, pageSize: 25, total: 48213, source: { label: "Cairn request audit log" } };
  },
};`;

const eventsBand = mount(
  `React.createElement(Kit.EventsPanel, {
    adapter: eventsAdapter, presentation: "table", headerPresentation: "page", title: "Audit events",
    search: { placeholder: "Search actor, request method, or route…" }, storageKey: "events",
    headerCollapsible: { storageKey: "events" },
  })`,
  eventsAdapter,
);

const collapsedBand = mount(
  `React.createElement(Kit.AdminPanelHeader, {
    title: "Audit events", presentation: "page",
    actions: React.createElement("button", { type: "button" }, "Refresh"),
    toolbar: React.createElement("input", { "aria-label": "Search", type: "search" }),
    collapsible: { storageKey: "chips", defaultCollapsed: true, collapsedSummary: React.createElement(React.Fragment, null,
      React.createElement("span", null, "48,213 events"),
      ["Severity: Error (5xx)", "Outcome: Failure", "Search: /api/agent/sessions"].map((label) =>
        React.createElement(Kit.AdminFilterChip, { key: label, label, onRemove() {} }))) },
  })`,
);

const usersWithSearch = mount(
  `React.createElement(Kit.UsersPanel, { adapter: usersAdapter })`,
  `const usersAdapter = { async list() { return { items: [{ id: "usr_1", label: "avery.long.email.address@example.test", role: { value: "owner", label: "Owner" }, status: { value: "active", label: "Active" } }], total: 1, page: 1, pageSize: 25 }; } };`,
);

type Scenario = { name: string; open: (page: Page) => Promise<void> };

const harness = (script: string): Scenario["open"] => (page) => serveDataTable(page, { script });

const scenarios: Scenario[] = [
  { name: "shell", open: (page) => page.goto(fileFixture("admin-shell.html")).then(() => undefined) },
  { name: "dialog", open: (page) => page.goto(fileFixture("admin-dialog.html")).then(() => undefined) },
  { name: "confirmation dialog", open: (page) => page.goto(fileFixture("admin-confirmation-dialog.html")).then(() => undefined) },
  { name: "panel band", open: harness(eventsBand) },
  { name: "collapsed band chips", open: harness(collapsedBand) },
  { name: "data table", open: harness(sixColumnScript(3)) },
  { name: "events panel", open: harness(eventsPanel) },
  { name: "users panel", open: harness(usersWithSearch) },
  { name: "users panel actions", open: harness(usersPanel) },
];

const stressors = {
  "text spacing": `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }`,
  "200% root font size": `html { font-size: 200% !important; } * { font-family: Verdana, "DejaVu Sans", sans-serif !important; }`,
} as const;

const expandText = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || /^(SCRIPT|STYLE)$/.test(parent.tagName) || !node.data.trim()) continue;
    node.data += node.data.slice(0, Math.ceil(node.data.length * 0.3));
  }
};

const horizontalPageOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const clippedText = (page: Page) =>
  page.evaluate(() => {
    const visible = (element: Element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const visuallyHidden = style.clipPath !== "none" && box.width <= 1 && box.height <= 1;
      return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && !visuallyHidden;
    };
    const hasOwnText = (element: Element) =>
      Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
    const describe = (element: Element) => `${element.tagName.toLowerCase()}.${element.className} "${element.textContent?.trim().slice(0, 40)}"`;
    const failures: string[] = [];
    for (const element of Array.from(document.body.querySelectorAll("*"))) {
      if (!hasOwnText(element) || !visible(element)) continue;
      const style = getComputedStyle(element);
      const clipsX = ["hidden", "clip"].includes(style.overflowX);
      const clipsY = ["hidden", "clip"].includes(style.overflowY);
      const truncates = style.textOverflow === "ellipsis" || style.webkitLineClamp !== "none";
      if (truncates) {
        const truncated = element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1;
        if (truncated && !element.closest("[title]") && !element.closest("[aria-label]")) failures.push(`truncated without title: ${describe(element)}`);
        continue;
      }
      if (clipsX && element.scrollWidth > element.clientWidth + 1) failures.push(`clipped horizontally: ${describe(element)}`);
      if (clipsY && element.scrollHeight > element.clientHeight + 1) failures.push(`clipped vertically: ${describe(element)}`);
    }
    return failures;
  });

const overlappingControls = (page: Page) =>
  page.evaluate(() => {
    const shownBox = (element: HTMLElement) => {
      const own = element.getBoundingClientRect();
      let { left, top, right, bottom } = own;
      for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (style.overflowX === "visible" && style.overflowY === "visible") continue;
        const clip = ancestor.getBoundingClientRect();
        left = Math.max(left, clip.left);
        top = Math.max(top, clip.top);
        right = Math.min(right, clip.right);
        bottom = Math.min(bottom, clip.bottom);
      }
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    };
    const controls = Array.from(document.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea"))
      .filter((element) => !element.closest("[hidden]") && getComputedStyle(element).visibility !== "hidden")
      .map((element) => ({ element, box: shownBox(element) }))
      .filter(({ box }) => box.width > 0 && box.height > 0);
    const overlaps: string[] = [];
    controls.forEach((first, index) => {
      for (const second of controls.slice(index + 1)) {
        const width = Math.min(first.box.right, second.box.right) - Math.max(first.box.left, second.box.left);
        const height = Math.min(first.box.bottom, second.box.bottom) - Math.max(first.box.top, second.box.top);
        if (width > 1 && height > 1 && !first.element.contains(second.element) && !second.element.contains(first.element)) {
          overlaps.push(`${first.element.outerHTML.slice(0, 60)} overlaps ${second.element.outerHTML.slice(0, 60)}`);
        }
      }
    });
    return overlaps;
  });

for (const scenario of scenarios) {
  test.describe(scenario.name, () => {
    for (const width of [1280, 768, 375]) {
      for (const [stress, css] of Object.entries(stressors)) {
        test(`${stress} at ${width}px keeps text unclipped and the page from scrolling sideways`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 });
          await scenario.open(page);
          await page.addStyleTag({ content: css });
          expect(await horizontalPageOverflow(page), "horizontal page overflow").toBeLessThanOrEqual(0);
          expect(await clippedText(page)).toEqual([]);
          if (stress === "200% root font size") expect(await overlappingControls(page)).toEqual([]);
        });
      }

      test(`1.3x longer text at ${width}px wraps or truncates with a title`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await scenario.open(page);
        await page.evaluate(expandText);
        expect(await horizontalPageOverflow(page), "horizontal page overflow").toBeLessThanOrEqual(0);
        expect(await clippedText(page)).toEqual([]);
      });
    }
  });
}
