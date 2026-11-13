import { expect, test, type Page } from "@playwright/test";
import { mount, serveDataTable, usersPanel } from "./data-table-harness";

const REQUEST_PATH = "/api/projects/CAIRN/tickets/cmp9x3q0e0001abcdefghijkl/comments/cmp9x3q0e0002";
const SEARCH_PLACEHOLDER = "Search actor, request method, or route…";

const eventsAdapter = `
const eventsAdapter = {
  severities: [{ value: "info", label: "Info" }, { value: "error", label: "Error (5xx)" }],
  outcomes: [{ value: "success", label: "Success" }, { value: "failure", label: "Failure" }],
  async list(query) {
    const items = Array.from({ length: 25 }, (_, index) => ({
      id: "evt_" + index,
      occurredAt: "2026-11-13T11:17:00.000Z",
      category: "request",
      action: "POST",
      message: "POST ${REQUEST_PATH} returned 502",
      severity: query.severity ?? "error",
      outcome: query.outcome ?? "failure",
      actor: { label: "andrew.popov@example.test" },
      resource: { label: "${REQUEST_PATH}" },
      metadata: { status: "502" },
    }));
    return { items, page: 1, pageSize: 25, total: 48213, source: { label: "Cairn request audit log" } };
  },
};`;

const eventsBand = mount(
  `React.createElement(Kit.EventsPanel, {
    adapter: eventsAdapter,
    presentation: "table",
    headerPresentation: "page",
    title: "Audit events",
    search: { placeholder: ${JSON.stringify(SEARCH_PLACEHOLDER)} },
    storageKey: "events",
    headerCollapsible: { storageKey: "events" },
  })`,
  eventsAdapter,
);

const composedBand = mount(
  `React.createElement(React.Fragment, null,
    React.createElement(Kit.AdminPanelHeader, {
      title: "Deliveries",
      presentation: "page",
      detail: React.createElement("p", null, "Outbox deliveries"),
      summary: React.createElement("div", null, "Worker running · 1,957 deliveries"),
      toolbar: React.createElement("input", { "aria-label": "Search deliveries", type: "search" }),
      actions: React.createElement("button", { type: "button" }, "Send test alert"),
      collapsible: { storageKey: "deliveries", collapsedSummary: React.createElement("span", null, "Worker running · 1,957 deliveries") },
    }),
    React.createElement("div", { role: "alert", id: "notice" }, "Delivery worker is not running"),
    React.createElement(Kit.AdminDataTable, { columns, rows, rowKey: (row) => row.id, label: "Deliveries" }))`,
  `const rows = Array.from({ length: 6 }, (_, index) => ({ id: "row" + index, name: "Delivery " + index }));
   const columns = [{ id: "name", header: "Name", cell: (row) => row.name }];`,
);

const toggle = (page: Page) => page.getByRole("button", { name: /controls/ });
const region = (page: Page) => page.locator(".admin-kit__panel-header-region");
const tableTop = (page: Page) =>
  page.locator(".admin-kit__data-table-wrap").evaluate((wrap) => wrap.getBoundingClientRect().top);

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test.describe("collapsible page band", () => {
  test("collapse and expand hide and show the region", async ({ page }) => {
    await serveDataTable(page, { script: composedBand });
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("searchbox", { name: "Search deliveries" })).toBeVisible();

    await toggle(page).click();
    await expect(toggle(page)).toHaveText("Show controls");
    await expect(region(page)).toBeHidden();
    await expect(page.getByRole("searchbox", { name: "Search deliveries" })).toBeHidden();

    await toggle(page).click();
    await expect(toggle(page)).toHaveText("Hide controls");
    await expect(region(page)).toBeVisible();
  });

  test("the table moves up by the region's height, and the notice, title and action stay", async ({
    page,
  }) => {
    await serveDataTable(page, { script: composedBand });
    const regionHeight = (await region(page).boundingBox())!.height;
    const before = await tableTop(page);

    await toggle(page).click();

    const after = await tableTop(page);
    expect(regionHeight).toBeGreaterThan(60);
    expect(before - after).toBeGreaterThanOrEqual(regionHeight - 1);
    await expect(page.locator("#notice")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Deliveries" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send test alert" })).toBeVisible();
    await expect(page.locator(".admin-kit__panel-header-summary-line")).toContainText(
      "Worker running · 1,957 deliveries",
    );
  });

  test("the summary line shares the title row from 64rem and takes its own line below", async ({
    page,
  }) => {
    await serveDataTable(page, { script: composedBand });
    await toggle(page).click();
    const summary = page.locator(".admin-kit__panel-header-summary-line");
    const title = page.getByRole("heading", { name: "Deliveries" });
    const wide = [await summary.boundingBox(), await title.boundingBox()];
    expect(Math.abs(wide[0]!.y - wide[1]!.y)).toBeLessThan(wide[1]!.height);

    await page.setViewportSize({ width: 900, height: 900 });
    const narrow = [await summary.boundingBox(), await title.boundingBox()];
    expect(narrow[0]!.y).toBeGreaterThanOrEqual(narrow[1]!.y + narrow[1]!.height);
  });

  test("a reload restores the stored state", async ({ page }) => {
    await serveDataTable(page, { script: composedBand });
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");

    await page.reload();

    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
    await expect(region(page)).toBeHidden();
    expect(
      await page.evaluate(() => localStorage.getItem("admin-kit:header:deliveries:regular")),
    ).toBe("collapsed");
  });

  test("starts collapsed on a phone and on a short window, expanded on a tall desktop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await serveDataTable(page, { script: composedBand });
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);

    await page.setViewportSize({ width: 1280, height: 700 });
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
  });

  test("toggles from the keyboard and keeps focus on the toggle", async ({ page }) => {
    await serveDataTable(page, { script: composedBand });
    await toggle(page).focus();

    await page.keyboard.press("Enter");
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
    await expect(toggle(page)).toBeFocused();

    await page.keyboard.press("Space");
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
    await expect(toggle(page)).toBeFocused();
  });

  test("a collapsed region is out of the tab order", async ({ page }) => {
    await serveDataTable(page, { script: composedBand });
    const search = page.locator('input[aria-label="Search deliveries"]');
    await toggle(page).focus();
    await page.keyboard.press("Tab");
    await expect(search).toBeFocused();

    await toggle(page).click();
    await toggle(page).focus();
    await page.keyboard.press("Tab");
    await expect(search).not.toBeFocused();
  });

  test("state is read before the first paint", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("admin-kit:header:deliveries:regular", "collapsed");
      const shifts: number[] = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          shifts.push((entry as PerformanceEntry & { value: number }).value);
      }).observe({ type: "layout-shift", buffered: true });
      const firstRegionHidden: boolean[] = [];
      new MutationObserver((records) => {
        for (const record of records) {
          for (const node of Array.from(record.addedNodes)) {
            if (!(node instanceof Element)) continue;
            const found = node.matches(".admin-kit__panel-header-region")
              ? node
              : node.querySelector(".admin-kit__panel-header-region");
            if (found && firstRegionHidden.length === 0)
              firstRegionHidden.push((found as HTMLElement).hidden);
          }
        }
      }).observe(document, { childList: true, subtree: true });
      Object.assign(window, { __shifts: shifts, __firstRegionHidden: firstRegionHidden });
    });
    await serveDataTable(page, { script: composedBand });
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
    await page.waitForTimeout(300);

    const { hidden, shifts } = await page.evaluate(() => ({
      hidden: (window as unknown as { __firstRegionHidden: boolean[] }).__firstRegionHidden,
      shifts: (window as unknown as { __shifts: number[] }).__shifts,
    }));
    expect(hidden).toEqual([true]);
    expect(shifts.reduce((total, value) => total + value, 0)).toBe(0);
  });
});

test.describe("EventsPanel in the band", () => {
  test("applied filters stay visible and removable as chips while collapsed", async ({ page }) => {
    await serveDataTable(page, { script: eventsBand });
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await region(page).getByLabel("Severity").selectOption("error");
    await region(page).getByLabel("Outcome").selectOption("failure");

    await toggle(page).click();

    await expect(toggle(page)).toContainText("Show controls");
    await expect(toggle(page)).toContainText("(2)");
    await expect(region(page)).toBeHidden();
    const chips = page.locator(".admin-kit__filter-chip");
    await expect(chips).toHaveCount(2);
    await expect(chips.first()).toContainText("Severity: Error (5xx)");
    await expect(page.locator(".admin-kit__panel-header-summary-line")).toContainText(
      "48213 events",
    );

    await page.getByRole("button", { name: "Remove filter: Severity: Error (5xx)" }).click();

    await expect(chips).toHaveCount(1);
    await expect(chips.first()).toContainText("Outcome: Failure");
    await expect(toggle(page)).toBeFocused();
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
    await expect(region(page)).toBeHidden();
  });

  test("the table top is at most 150px down at 1280x800 once collapsed", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await serveDataTable(page, { script: eventsBand });
    await expect(page.locator("tbody tr").first()).toBeVisible();
    const expanded = await tableTop(page);

    await toggle(page).click();

    const collapsed = await tableTop(page);
    expect(collapsed).toBeLessThan(expanded - 100);
    expect(collapsed).toBeLessThanOrEqual(150);
  });

  test("prints the path once and in full, on at most two lines", async ({ page }) => {
    await serveDataTable(page, { script: eventsBand });
    const row = page.locator("tbody tr").first();
    await expect(row).toBeVisible();

    const body = await row.innerText();
    expect(body.split(REQUEST_PATH).length - 1).toBe(1);
    const resource = row.locator(".admin-kit__events-resource");
    await expect(resource).toHaveText(REQUEST_PATH);
    await expect(resource.locator("xpath=ancestor::td")).toHaveAttribute("title", REQUEST_PATH);
    const lines = await resource.evaluate((node) => {
      const style = getComputedStyle(node);
      return Math.round(node.getBoundingClientRect().height / parseFloat(style.lineHeight));
    });
    expect(lines).toBeLessThanOrEqual(2);
    await expect(row).toContainText("returned 502");
  });

  test("the time stays on one line", async ({ page }) => {
    await serveDataTable(page, { script: eventsBand });
    const time = page.locator("tbody tr").first().locator(".admin-kit__event-time > span");
    await expect(time).toBeVisible();
    expect(await time.evaluate((node) => getComputedStyle(node).whiteSpace)).toBe("nowrap");
    const lines = await time.evaluate(
      (node) => node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight),
    );
    expect(lines).toBeLessThan(1.5);
  });

  test("details header sits on the same row as the other headers", async ({ page }) => {
    await serveDataTable(page, { script: eventsBand });
    await expect(page.locator("thead th").first()).toBeVisible();
    const boxes = await page.locator("thead th").evaluateAll((cells) =>
      cells.map((cell) => {
        const text = cell
          .querySelector(".admin-kit__data-table-heading-text")!
          .getBoundingClientRect();
        return { top: text.top, height: text.height };
      }),
    );
    expect(boxes.length).toBeGreaterThan(1);
    for (const box of boxes) {
      expect(box.top).toBeCloseTo(boxes[0].top, 0);
      expect(box.height).toBeCloseTo(boxes[0].height, 0);
    }
  });
});

test.describe("search placeholders", () => {
  for (const width of [1024, 1280, 1440]) {
    test(`events search shows its whole placeholder at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await serveDataTable(page, { script: eventsBand });
      await expect(page.locator("tbody tr").first()).toBeVisible();
      expect(
        await placeholderOverflow(page, ".admin-kit__events-search input"),
      ).toBeLessThanOrEqual(0);
    });
  }

  test("users search shows its whole placeholder", async ({ page }) => {
    await serveDataTable(page, {
      script: usersWithSearch,
    });
    await expect(page.locator("tbody tr").first()).toBeVisible();
    expect(await placeholderOverflow(page, ".admin-kit__users-search input")).toBeLessThanOrEqual(
      0,
    );
  });
});

const usersWithSearch = mount(
  `React.createElement(Kit.UsersPanel, { adapter: usersAdapter, headerPresentation: "page", search: { placeholder: "Search by name, email, or role" } })`,
  `const usersAdapter = { async list() { return { items: [{ id: "usr_1", label: "Avery", role: { value: "owner", label: "Owner" }, status: { value: "active", label: "Active" } }], total: 1, page: 1, pageSize: 25 }; } };`,
);

async function placeholderOverflow(page: Page, selector: string) {
  return page.locator(selector).evaluate((input) => {
    const field = input as HTMLInputElement;
    const style = getComputedStyle(field);
    const context = document.createElement("canvas").getContext("2d")!;
    context.font = style.font;
    const room = field.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return Math.ceil(context.measureText(field.placeholder).width - room);
  });
}

test("AdminActionButton keeps a gap between its icon and label", async ({ page }) => {
  await serveDataTable(page, {
    script: mount(
      `React.createElement(Kit.AdminActionButton, { tone: "danger" }, React.createElement("svg", { width: 16, height: 16, "aria-hidden": true }), "Delete")`,
    ),
  });
  const gap = await page
    .getByRole("button", { name: "Delete" })
    .evaluate((button) => getComputedStyle(button).columnGap);
  expect(gap).toBe("6px");
  const iconRight = await page
    .locator("button svg")
    .evaluate((icon) => icon.getBoundingClientRect().right);
  const textLeft = await page.getByRole("button", { name: "Delete" }).evaluate((button) => {
    const range = document.createRange();
    range.selectNodeContents(button.lastChild!);
    return range.getBoundingClientRect().left;
  });
  expect(textLeft - iconRight).toBeGreaterThanOrEqual(5.5);
});
