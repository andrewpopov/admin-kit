import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const origin = "http://admin-kit.test";
const umd = (name: string, file: string) => resolve("node_modules", name, "umd", file);
const read = (path: string) => readFileSync(path, "utf8");

const bootstrap = `
const mods = {
  react: React,
  "react/jsx-runtime": {
    jsx: (type, props, key) => React.createElement(type, key === undefined ? props : { ...props, key }),
    Fragment: React.Fragment,
  },
};
mods["react/jsx-runtime"].jsxs = mods["react/jsx-runtime"].jsx;
const load = (source) => {
  const module = { exports: {} };
  new Function("require", "module", "exports", source)((name) => mods[name], module, module.exports);
  return module.exports;
};
mods["./AdminTablePrimitives"] = load(window.__primitives);
const { AdminDataTable } = load(window.__dataTable);
const rows = [
  { id: "a", scope: "cairn.read", owner: "Avery", notes: "Read-only access" },
  { id: "b", scope: "cairn.write", owner: "Blake", notes: "Writes tickets" },
];
const columns = [
  { id: "scope", header: "Scope", defaultWidth: 200, cell: (row) => row.scope },
  { id: "owner", header: "Owner", defaultWidth: 160, cell: (row) => row.owner },
  { id: "notes", header: "Notes", cell: (row) => row.notes },
];
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(AdminDataTable, { columns, rows, rowKey: (row) => row.id, label: "Scopes", storageKey: "scopes" }),
);
`;

async function serveTable(page: Page) {
  const body = (path: string) => ({ body: read(path), contentType: "text/javascript" });
  const files: Record<string, { body: string; contentType: string }> = {
    "/": {
      contentType: "text/html",
      body: `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"></head>
<body><div class="admin-kit admin-kit--theme-core" style="padding: 2rem"><div id="root"></div></div>
<script src="/react.js"></script><script src="/react-dom.js"></script>
<script src="/sources.js"></script><script src="/bootstrap.js"></script></body></html>`,
    },
    "/styles.css": { body: read("dist/styles.css"), contentType: "text/css" },
    "/react.js": body(umd("react", "react.development.js")),
    "/react-dom.js": body(umd("react-dom", "react-dom.development.js")),
    "/sources.js": {
      contentType: "text/javascript",
      body: `window.__primitives = ${JSON.stringify(read("dist/react/AdminTablePrimitives.js"))};
window.__dataTable = ${JSON.stringify(read("dist/react/AdminDataTable.js"))};`,
    },
    "/bootstrap.js": { body: bootstrap, contentType: "text/javascript" },
  };
  await page.route(`${origin}/**`, (route) => {
    const file = files[new URL(route.request().url()).pathname];
    return file ? route.fulfill(file) : route.fulfill({ status: 404 });
  });
  await page.goto(`${origin}/`);
}

test("resizes and resets a data table column with single clicks only, and the width persists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveTable(page);
  const handle = page.getByRole("separator", { name: "Resize Scope column" });
  await expect(handle).toHaveAttribute("aria-valuenow", "200");

  await handle.click();
  const menu = page.getByRole("group", { name: "Scope column width" });
  await expect(menu).toBeVisible();
  const wrapBox = await page.locator(".admin-kit__data-table-wrap").boundingBox();
  const menuBox = await menu.boundingBox();
  expect(menuBox!.x + menuBox!.width, "menu stays inside the table wrap").toBeLessThanOrEqual(
    wrapBox!.x + wrapBox!.width,
  );
  expect(menuBox!.y + menuBox!.height, "menu is not clipped by the table wrap").toBeLessThanOrEqual(
    wrapBox!.y + wrapBox!.height,
  );

  await menu.getByRole("button", { name: "Widen Scope column" }).click();
  await menu.getByRole("button", { name: "Widen Scope column" }).click();
  await menu.getByRole("button", { name: "Narrow Scope column" }).click();
  await expect(handle).toHaveAttribute("aria-valuenow", "232");
  expect(await page.evaluate(() => localStorage.getItem("admin-kit:table-widths:scopes"))).toBe(
    JSON.stringify({ scope: 232 }),
  );

  await page.reload();
  await expect(handle).toHaveAttribute("aria-valuenow", "232");

  await handle.click();
  await page.getByRole("button", { name: "Reset Scope column width" }).click();
  await expect(handle).toHaveAttribute("aria-valuenow", "200");
  await expect(page.getByRole("group", { name: "Scope column width" })).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("admin-kit:table-widths:scopes")),
  ).toBeNull();
});
