import { existsSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { mount, serveDataTable, sixColumnScript } from "./data-table-harness";

const localChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

test.use({
  launchOptions: {
    executablePath: existsSync(localChrome) ? localChrome : undefined,
    ignoreDefaultArgs: ["--hide-scrollbars"],
  },
});

const bareFrame =
  'body { margin: 0 } .admin-kit { padding: 0 !important } #root::before { content: ""; display: block; height: 240px }';

const filledTable = (fill: boolean) => `
const rows = Array.from({ length: 50 }, (_, index) => ({ id: "row" + index, name: "Deployment " + index }));
const columns = [
  { id: "name", header: "Name", minWidth: 160, cardSlot: "title", cell: (row) => row.name },
  { id: "state", header: "State", defaultWidth: 120, minWidth: 100, cell: () => "active" },
];
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(React.Fragment, null,
    React.createElement(AdminDataTable, { columns, rows, rowKey: (row) => row.id, label: "Keys", fill: ${fill} }),
    React.createElement("nav", { "aria-label": "Pagination", style: { height: "44px" } }, "Page 1 of 3")),
);
`;

const pageOverflow = () => {
  const root = document.scrollingElement!;
  return root.scrollHeight - window.innerHeight;
};

test("fill table leaves no page scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, { script: filledTable(true), headStyle: bareFrame });
  await expect(page.locator(".admin-kit__data-table-wrap")).toHaveAttribute("data-fill", "true");
  expect(await page.evaluate(pageOverflow)).toBeLessThanOrEqual(0);
});

test("fill table scrolls inside its wrap with the header row pinned", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, { script: filledTable(true), headStyle: bareFrame });
  const wrap = page.locator(".admin-kit__data-table-wrap");
  await expect(wrap).toHaveAttribute("data-fill", "true");
  const scrolled = await wrap.evaluate((node) => {
    node.scrollTop = 600;
    return { scrollTop: node.scrollTop, overflow: node.scrollHeight - node.clientHeight };
  });
  expect(scrolled.overflow, "the wrap holds the rows").toBeGreaterThan(0);
  expect(scrolled.scrollTop, "the wrap scrolls").toBeGreaterThan(0);
  const [wrapBox, headBox, firstRow] = await Promise.all([
    wrap.boundingBox(),
    page.locator("thead th").first().boundingBox(),
    page.locator("tbody tr").first().boundingBox(),
  ]);
  expect(Math.abs(headBox!.y - (wrapBox!.y + 1)), "the header stays at the wrap's top").toBeLessThan(3);
  expect(firstRow!.y, "the first row scrolled away").toBeLessThan(headBox!.y);
});

test("fill table keeps pagination in view under the wrap", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, { script: filledTable(true), headStyle: bareFrame });
  await expect(page.locator(".admin-kit__data-table-wrap")).toHaveAttribute("data-fill", "true");
  const [wrapBox, navBox] = await Promise.all([
    page.locator(".admin-kit__data-table-wrap").boundingBox(),
    page.getByRole("navigation", { name: "Pagination" }).boundingBox(),
  ]);
  expect(navBox!.y).toBeGreaterThanOrEqual(wrapBox!.y + wrapBox!.height);
  expect(navBox!.y + navBox!.height).toBeLessThanOrEqual(800);
});

test("fill table follows the viewport when it resizes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, { script: filledTable(true), headStyle: bareFrame });
  const wrap = page.locator(".admin-kit__data-table-wrap");
  await expect(wrap).toHaveAttribute("data-fill", "true");
  const before = (await wrap.boundingBox())!.height;
  await page.setViewportSize({ width: 1280, height: 1000 });
  await expect.poll(async () => (await wrap.boundingBox())!.height).toBeGreaterThan(before + 150);
  expect(await page.evaluate(pageOverflow)).toBeLessThanOrEqual(0);
});

test("without fill the table is capped and the page scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, { script: filledTable(false), headStyle: bareFrame });
  await expect(page.locator(".admin-kit__data-table-wrap")).toBeVisible();
  await expect(page.locator(".admin-kit__data-table-wrap")).not.toHaveAttribute("data-fill", /.*/);
  expect(await page.evaluate(pageOverflow)).toBeGreaterThan(0);
});

test("stacked cards keep the page flow when fill is set", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await serveDataTable(page, {
    script: sixColumnScript(50).replace('storageKey: "keys"', 'storageKey: "keys", fill: true'),
    headStyle: bareFrame,
  });
  const wrap = page.locator(".admin-kit__data-table-wrap");
  await expect(wrap).toHaveAttribute("data-stacked", "true");
  const inner = await wrap.evaluate((node) => node.scrollHeight - node.clientHeight);
  expect(inner, "cards do not scroll inside the wrap").toBeLessThanOrEqual(0);
  expect(await page.evaluate(pageOverflow), "the page carries the cards").toBeGreaterThan(0);
});

test("a real vertical scrollbar does not flip a fill table between table and cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, {
    script: sixColumnScript(60).replace('storageKey: "keys"', 'storageKey: "keys", fill: true'),
    containerWidth: 623,
    headStyle: `${bareFrame}; ::-webkit-scrollbar { width: 15px; height: 15px; }`,
  });
  const wrap = page.locator(".admin-kit__data-table-wrap");
  await expect(wrap).toHaveAttribute("data-fill", "true");
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

const deliveriesTable = `
const rows = [{ id: "d1" }];
const columns = [
  { id: "delivery", header: "Delivery", cell: () => "Webhook" },
  { id: "status", header: "Status", defaultWidth: 120, minWidth: 100, cell: () => "failed" },
  { id: "detail", header: "Detail", defaultWidth: 280, minWidth: 160, cell: () => "502" },
  { id: "attempts", header: "Attempts", defaultWidth: 90, minWidth: 80, cell: () => "3" },
  { id: "when", header: "Created", defaultWidth: 150, minWidth: 120, cell: () => "now" },
];
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(AdminDataTable, { columns, rows, rowKey: (row) => row.id, label: "Deliveries", renderDetails: () => "more" }),
);
`;

test("the fill column reaches its fillWidth while sized columns shrink", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, { script: deliveriesTable, containerWidth: 888, headStyle: bareFrame });
  await expect(page.getByRole("table", { name: "Deliveries" })).toBeVisible();
  const widths = await page.locator("thead th").evaluateAll((cells) =>
    Object.fromEntries(cells.map((cell) => [cell.getAttribute("aria-label"), cell.getBoundingClientRect().width])),
  );
  expect(widths.Delivery, "the identity column").toBeGreaterThanOrEqual(280);
  expect(widths.Detail, "Detail gave way").toBeLessThan(280);
  expect(widths.Detail).toBeGreaterThanOrEqual(160);
});

const frame = (style: string) =>
  mount(`React.createElement("div", { className: "admin-kit__app", id: "frame", style: ${style} })`);
const frameHeight = (page: Page) =>
  page.locator("#frame").evaluate((node) => node.getBoundingClientRect().height);

test("the frame minimum height follows --admin-kit-app-min-block-size", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, {
    script: frame(`{ "--admin-kit-app-min-block-size": "calc(100dvh - 45px)" }`),
    headStyle: bareFrame,
  });
  expect(await frameHeight(page)).toBe(755);
});

test("the frame minimum height defaults to the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, { script: frame("{}"), headStyle: bareFrame });
  expect(await frameHeight(page)).toBe(800);
});

const usersInApp = `
const usersAdapter = { async list() {
  return { items: Array.from({ length: 50 }, (_, index) => ({
    id: "usr_" + index, label: "User " + index, secondaryLabel: "user" + index + "@example.test",
    role: { value: "member", label: "Member" }, status: { value: "active", label: "Active" },
  })), total: 200, page: 1, pageSize: 25 };
} };
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Kit.AdminApp, {
  activeSection: "users",
  onSectionChange: () => undefined,
  groups: [{ id: "administration", label: "Administration", sections: [{
    id: "users", label: "Users", capability: "users",
    render: () => React.createElement(Kit.UsersPanel, { adapter: usersAdapter, search: false, tableFill: true }),
  }] }],
}));
`;
const hostHeader =
  'body { margin: 0 } .admin-kit { padding: 0 !important; --admin-kit-app-min-block-size: calc(100dvh - 45px) } #root::before { content: ""; display: block; height: 45px }';

for (const [width, height] of [
  [1280, 800],
  [1024, 768],
  [1440, 900],
  [1280, 600],
]) {
  test(`a real UsersPanel in AdminApp with pagination does not scroll the page at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await serveDataTable(page, { script: usersInApp, headStyle: hostHeader });
    await expect(page.locator(".admin-kit__data-table-wrap")).toHaveAttribute("data-fill", "true");
    const pagination = page.getByRole("navigation", { name: "User pagination" });
    await expect(pagination).toBeVisible();
    await page.waitForTimeout(200);
    expect(await page.evaluate(pageOverflow), "page scroll").toBeLessThanOrEqual(0);
    const nav = (await pagination.boundingBox())!;
    expect(nav.y + nav.height, "pagination bottom").toBeLessThanOrEqual(height);
    const wrap = (await page.locator(".admin-kit__data-table-wrap").boundingBox())!;
    expect(height - (wrap.y + wrap.height), "the table fills down to the pagination").toBeLessThan(150);
  });
}

const bandOutsideParent = `
const rows = Array.from({ length: 50 }, (_, index) => ({ id: "row" + index, name: "Deployment " + index }));
const columns = [
  { id: "name", header: "Name", minWidth: 160, cell: (row) => row.name },
  { id: "state", header: "State", defaultWidth: 120, minWidth: 100, cell: () => "active" },
];
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement("div", { style: { minHeight: "100dvh" } },
    React.createElement("div", { id: "band", style: { height: "160px" } }, "Controls"),
    React.createElement("section", null,
      React.createElement(AdminDataTable, { columns, rows, rowKey: (row) => row.id, label: "Keys", fill: true }),
      React.createElement("nav", { "aria-label": "Pagination", style: { height: "44px" } }, "Page 1"))),
);
`;

test("fill table grows into the room a band outside its parent frees", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, {
    script: bandOutsideParent,
    headStyle: "body { margin: 0 } .admin-kit { padding: 0 !important }",
  });
  const wrap = page.locator(".admin-kit__data-table-wrap");
  await expect(wrap).toHaveAttribute("data-fill", "true");
  await page.locator("#band").evaluate((band) => (band.hidden = true));
  await expect
    .poll(async () => {
      const box = (await wrap.boundingBox())!;
      return 800 - (box.y + box.height);
    })
    .toBeLessThanOrEqual(60);
});

const tabbableRows = `
const rows = Array.from({ length: 50 }, (_, index) => ({ id: "row" + index, name: "Deployment " + index }));
const columns = [
  { id: "name", header: "Name", minWidth: 160, cell: (row) => row.name },
  { id: "act", header: "Action", defaultWidth: 160, minWidth: 120, cell: (row) => React.createElement("button", { type: "button" }, "Open " + row.name) },
];
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(AdminDataTable, { columns, rows, rowKey: (row) => row.id, label: "Keys", fill: true }),
);
`;

test("Shift+Tab never leaves the focused control under the pinned header", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, { script: tabbableRows, headStyle: bareFrame });
  const wrap = page.locator(".admin-kit__data-table-wrap");
  await expect(wrap).toHaveAttribute("data-fill", "true");
  const hidden: string[] = [];
  for (const target of [10, 20, 30, 40]) {
    await wrap.evaluate((node, name) => {
      const button = [...node.querySelectorAll("button")].find((candidate) => candidate.textContent === name)!;
      const header = node.querySelector("th")!.getBoundingClientRect().height;
      node.scrollTop += button.getBoundingClientRect().top - node.getBoundingClientRect().top - header / 2;
    }, `Open Deployment ${target}`);
    await page.getByRole("button", { name: `Open Deployment ${target + 1}`, exact: true }).focus();
    await page.keyboard.press("Shift+Tab");
    const cleared = await page.evaluate(() => {
      const focused = document.activeElement!.getBoundingClientRect();
      return focused.top >= document.querySelector("th")!.getBoundingClientRect().bottom - 1;
    });
    if (!cleared) hidden.push(`Deployment ${target}`);
  }
  expect(hidden).toEqual([]);
});

test("a short viewport keeps the table at most 60% of the screen", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await serveDataTable(page, { script: filledTable(true), headStyle: bareFrame });
  const wrap = page.locator(".admin-kit__data-table-wrap");
  await expect(wrap).toHaveAttribute("data-fill", "true");
  await expect(wrap).not.toHaveAttribute("data-stacked", /.*/);
  expect((await wrap.boundingBox())!.height).toBeLessThanOrEqual(375 * 0.6 + 1);
});
